import { useEffect, useState } from 'react';
import { LANGS, setLang, t } from './i18n';
import { exerciseKind, getExercise } from './engine/exercises';
import { PickerScreen } from './ui/screens/PickerScreen';
import { SetupScreen } from './ui/screens/SetupScreen';
import { WorkoutScreen } from './ui/screens/WorkoutScreen';
import { SummaryScreen } from './ui/screens/SummaryScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { RoutinesScreen } from './ui/screens/RoutinesScreen';
import { RoutineEditor } from './ui/screens/RoutineEditor';
import { RoutineRunner } from './ui/screens/RoutineRunner';
import { RoutineSummaryScreen } from './ui/screens/RoutineSummaryScreen';
import { BodyScreen } from './ui/body/BodyScreen';
import { buildSummary, hasProgress, type SessionSummary } from './state/session';
import { bestSetValue, loadHistory, saveSession } from './state/history';
import { computeBadges, newlyEarned, type Badge } from './state/badges';
import { currentStreak } from './state/progress';
import { loadSettings, saveSettings, type Settings } from './state/settings';
import { BUILT_IN_ROUTINES, loadCustomRoutines, newRoutineId, saveCustomRoutines, type Routine } from './state/routines';
import { defaultPlan, type SetResult, type WorkoutPlan } from './state/workoutSession';
import { RecordingDownload } from './ui/components/RecordingDownload';
import { sessionRecorder } from './engine/recorder';
import styles from './App.module.css';

type Screen =
  | { name: 'picker' }
  | { name: 'setup'; exerciseId: string }
  | { name: 'workout'; exerciseId: string; plan: WorkoutPlan; previousBest: number }
  | {
      name: 'summary';
      summary: SessionSummary;
      saved: boolean;
      previousBest: number;
      newBadges: Badge[];
      streak: number;
    }
  | { name: 'routines' }
  | { name: 'routine-edit'; routine: Routine }
  | { name: 'routine-run'; routine: Routine; badgesBefore: Badge[] }
  | {
      name: 'routine-summary';
      routine: Routine;
      results: SessionSummary[];
      completed: boolean;
      newBadges: Badge[];
      streak: number;
    }
  | { name: 'body' }
  | { name: 'history' };

type Tab = 'exercises' | 'routines' | 'body' | 'history';

const tabOf = (screen: Screen): Tab =>
  screen.name === 'history'
    ? 'history'
    : screen.name === 'body'
      ? 'body'
      : screen.name.startsWith('routine')
        ? 'routines'
        : 'exercises';

const voiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const EMPTY_ROUTINE: Routine = { id: '', name: '', steps: [], restBetweenSec: 90 };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'picker' });
  // "Record this session": asked before each workout, off by default
  const [record, setRecord] = useState(false);
  // a recording only lives through the workout and its summary; anywhere else it's dropped
  useEffect(() => {
    if (!['workout', 'summary', 'routine-run', 'routine-summary'].includes(screen.name)) sessionRecorder.discard();
  }, [screen.name]);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [customRoutines, setCustomRoutines] = useState<Routine[]>(() => loadCustomRoutines());
  // every t('...') call below reads the language set here
  setLang(settings.language);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const toggleVoice = () => updateSettings({ voiceEnabled: !settings.voiceEnabled });

  const planFor = (exerciseId: string): WorkoutPlan => ({
    ...defaultPlan(exerciseKind(getExercise(exerciseId))),
    ...settings.plans[exerciseId],
  });

  // ---- single exercise ----
  const startWorkout = (exerciseId: string, plan: WorkoutPlan) => {
    updateSettings({ plans: { ...settings.plans, [exerciseId]: plan } });
    setScreen({ name: 'workout', exerciseId, plan, previousBest: bestSetValue(loadHistory(), exerciseId) });
  };

  const finishWorkout = (
    exerciseId: string,
    plan: WorkoutPlan,
    sets: SetResult[],
    startedAt: number,
    previousBest: number,
  ) => {
    const def = getExercise(exerciseId);
    const summary = buildSummary({ id: def.id, name: def.name, kind: exerciseKind(def) }, plan, startedAt, sets);
    const badgesBefore = computeBadges(loadHistory());
    const saved = hasProgress(summary.totals) ? saveSession(summary) : false;
    const after = loadHistory();
    setScreen({
      name: 'summary',
      summary,
      saved,
      previousBest,
      newBadges: newlyEarned(badgesBefore, computeBadges(after)),
      streak: currentStreak(after),
    });
  };

  const startRoutine = (routine: Routine) =>
    setScreen({ name: 'routine-run', routine, badgesBefore: computeBadges(loadHistory()) });

  // ---- routines ----
  const storeRoutines = (list: Routine[]) => {
    setCustomRoutines(list);
    saveCustomRoutines(list);
  };

  const saveRoutine = (routine: Routine) => {
    const exists = customRoutines.some((r) => r.id === routine.id);
    storeRoutines(exists ? customRoutines.map((r) => (r.id === routine.id ? routine : r)) : [...customRoutines, routine]);
    setScreen({ name: 'routines' });
  };

  const copyRoutine = (routine: Routine) => {
    setScreen({
      name: 'routine-edit',
      routine: {
        ...routine,
        id: '',
        builtIn: undefined,
        name: `${t(routine.name)} ${routine.builtIn ? t('(my version)') : t('(copy)')}`.slice(0, 40),
      },
    });
  };

  const tab = tabOf(screen);
  const inWorkout = screen.name === 'workout' || screen.name === 'routine-run';

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.logo} onClick={() => setScreen({ name: 'picker' })}>
          {t('Kinematic')}
        </button>
        <nav className={styles.nav}>
          {(
            [
              ['exercises', 'Exercises', { name: 'picker' }],
              ['routines', 'Routines', { name: 'routines' }],
              ['body', 'Body', { name: 'body' }],
              ['history', 'History', { name: 'history' }],
            ] as const
          ).map(([id, label, target]) => (
            <button
              key={id}
              className={`${styles.navLink} ${tab === id ? styles.navActive : ''}`}
              onClick={() => setScreen(target)}
              title={inWorkout ? t('Leaving will stop the current workout') : undefined}
            >
              {t(label)}
            </button>
          ))}
        </nav>
        <div className={styles.langSwitch} role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={settings.language === l.id}
              className={settings.language === l.id ? styles.langActive : ''}
              onClick={() => updateSettings({ language: l.id })}
            >
              {l.id === 'en' ? 'EN' : 'हिं'}
            </button>
          ))}
        </div>
      </header>
      <main className={styles.main}>
        {screen.name === 'picker' && (
          <PickerScreen
            weeklyGoal={settings.weeklyGoal}
            onSelect={(exerciseId) => setScreen({ name: 'setup', exerciseId })}
            onOpenBody={() => setScreen({ name: 'body' })}
          />
        )}

        {screen.name === 'setup' && (
          <SetupScreen
            key={screen.exerciseId}
            exerciseId={screen.exerciseId}
            initialPlan={planFor(screen.exerciseId)}
            voiceEnabled={settings.voiceEnabled}
            voiceSupported={voiceSupported}
            onToggleVoice={toggleVoice}
            camera={settings.camera}
            onCameraChange={(camera) => updateSettings({ camera })}
            startMode={settings.startMode}
            countdownSec={settings.countdownSec}
            onStartModeChange={(startMode, countdownSec) => updateSettings({ startMode, countdownSec })}
            record={record}
            onRecordChange={setRecord}
            onBack={() => setScreen({ name: 'picker' })}
            onStart={(plan) => startWorkout(screen.exerciseId, plan)}
          />
        )}

        {screen.name === 'workout' && (
          <WorkoutScreen
            key={screen.exerciseId}
            exerciseId={screen.exerciseId}
            plan={screen.plan}
            camera={settings.camera}
            startMode={settings.startMode}
            countdownSec={settings.countdownSec}
            previousBest={screen.previousBest}
            record={record}
            voiceEnabled={settings.voiceEnabled}
            voiceSupported={voiceSupported}
            onToggleVoice={toggleVoice}
            onBack={() => setScreen({ name: 'setup', exerciseId: screen.exerciseId })}
            onFinish={(sets, startedAt) =>
              finishWorkout(screen.exerciseId, screen.plan, sets, startedAt, screen.previousBest)
            }
          />
        )}

        {(screen.name === 'summary' || screen.name === 'routine-summary') && record && <RecordingDownload />}

        {screen.name === 'summary' && (
          <SummaryScreen
            summary={screen.summary}
            saved={screen.saved}
            previousBest={screen.previousBest}
            newBadges={screen.newBadges}
            streak={screen.streak}
            onAgain={() => setScreen({ name: 'setup', exerciseId: screen.summary.exerciseId })}
            onPickAnother={() => setScreen({ name: 'picker' })}
            onHistory={() => setScreen({ name: 'history' })}
          />
        )}

        {screen.name === 'routines' && (
          <RoutinesScreen
            builtIn={BUILT_IN_ROUTINES}
            custom={customRoutines}
            onStart={startRoutine}
            onNew={() => setScreen({ name: 'routine-edit', routine: { ...EMPTY_ROUTINE } })}
            onEdit={(routine) => setScreen({ name: 'routine-edit', routine })}
            onCopy={copyRoutine}
            onDelete={(id) => storeRoutines(customRoutines.filter((r) => r.id !== id))}
            level={settings.routineLevel}
            onLevelChange={(routineLevel) => updateSettings({ routineLevel })}
          />
        )}

        {screen.name === 'routine-edit' && (
          <RoutineEditor
            key={screen.routine.id || 'new'}
            initial={screen.routine}
            onCancel={() => setScreen({ name: 'routines' })}
            onSave={(routine) => saveRoutine({ ...routine, id: routine.id || newRoutineId() })}
          />
        )}

        {screen.name === 'routine-run' && (
          <RoutineRunner
            key={screen.routine.id}
            routine={screen.routine}
            voiceEnabled={settings.voiceEnabled}
            voiceSupported={voiceSupported}
            onToggleVoice={toggleVoice}
            camera={settings.camera}
            onCameraChange={(camera) => updateSettings({ camera })}
            startMode={settings.startMode}
            countdownSec={settings.countdownSec}
            onStartModeChange={(startMode, countdownSec) => updateSettings({ startMode, countdownSec })}
            level={settings.routineLevel ?? 3}
            record={record}
            onRecordChange={setRecord}
            onExerciseDone={(summary) => saveSession(summary)}
            onFinish={(results, completed) => {
              const after = loadHistory();
              setScreen({
                name: 'routine-summary',
                routine: screen.routine,
                results,
                completed,
                newBadges: newlyEarned(screen.badgesBefore, computeBadges(after)),
                streak: currentStreak(after),
              });
            }}
          />
        )}

        {screen.name === 'routine-summary' && (
          <RoutineSummaryScreen
            routineName={screen.routine.name}
            totalExercises={screen.routine.steps.length}
            results={screen.results}
            completed={screen.completed}
            newBadges={screen.newBadges}
            streak={screen.streak}
            onDone={() => setScreen({ name: 'routines' })}
            onHistory={() => setScreen({ name: 'history' })}
          />
        )}

        {screen.name === 'body' && <BodyScreen />}

        {screen.name === 'history' && (
          <HistoryScreen
            onStart={() => setScreen({ name: 'picker' })}
            onImported={() => setCustomRoutines(loadCustomRoutines())}
            weeklyGoal={settings.weeklyGoal}
            onWeeklyGoalChange={(weeklyGoal) => updateSettings({ weeklyGoal })}
          />
        )}
      </main>
    </div>
  );
}

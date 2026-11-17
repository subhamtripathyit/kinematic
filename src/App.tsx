import { useState } from 'react';
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
import { buildSummary, hasProgress, type SessionSummary } from './state/session';
import { saveSession } from './state/history';
import { loadSettings, saveSettings, type Settings } from './state/settings';
import { BUILT_IN_ROUTINES, loadCustomRoutines, newRoutineId, saveCustomRoutines, type Routine } from './state/routines';
import { defaultPlan, type SetResult, type WorkoutPlan } from './state/workoutSession';
import styles from './App.module.css';

type Screen =
  | { name: 'picker' }
  | { name: 'setup'; exerciseId: string }
  | { name: 'workout'; exerciseId: string; plan: WorkoutPlan }
  | { name: 'summary'; summary: SessionSummary; saved: boolean }
  | { name: 'routines' }
  | { name: 'routine-edit'; routine: Routine }
  | { name: 'routine-run'; routine: Routine }
  | { name: 'routine-summary'; routine: Routine; results: SessionSummary[]; completed: boolean }
  | { name: 'history' };

type Tab = 'exercises' | 'routines' | 'history';

const tabOf = (screen: Screen): Tab =>
  screen.name === 'history' ? 'history' : screen.name.startsWith('routine') ? 'routines' : 'exercises';

const voiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const EMPTY_ROUTINE: Routine = { id: '', name: '', steps: [], restBetweenSec: 90 };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'picker' });
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [customRoutines, setCustomRoutines] = useState<Routine[]>(() => loadCustomRoutines());

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
    setScreen({ name: 'workout', exerciseId, plan });
  };

  const finishWorkout = (exerciseId: string, plan: WorkoutPlan, sets: SetResult[], startedAt: number) => {
    const def = getExercise(exerciseId);
    const summary = buildSummary({ id: def.id, name: def.name, kind: exerciseKind(def) }, plan, startedAt, sets);
    const saved = hasProgress(summary.totals) ? saveSession(summary) : false;
    setScreen({ name: 'summary', summary, saved });
  };

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
        name: `${routine.name} ${routine.builtIn ? '(my version)' : '(copy)'}`.slice(0, 40),
      },
    });
  };

  const tab = tabOf(screen);
  const inWorkout = screen.name === 'workout' || screen.name === 'routine-run';

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.logo} onClick={() => setScreen({ name: 'picker' })}>
          Kinematic
        </button>
        <nav className={styles.nav}>
          {(
            [
              ['exercises', 'Exercises', { name: 'picker' }],
              ['routines', 'Routines', { name: 'routines' }],
              ['history', 'History', { name: 'history' }],
            ] as const
          ).map(([id, label, target]) => (
            <button
              key={id}
              className={`${styles.navLink} ${tab === id ? styles.navActive : ''}`}
              onClick={() => setScreen(target)}
              title={inWorkout ? 'Leaving will stop the current workout' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className={styles.main}>
        {screen.name === 'picker' && <PickerScreen onSelect={(exerciseId) => setScreen({ name: 'setup', exerciseId })} />}

        {screen.name === 'setup' && (
          <SetupScreen
            key={screen.exerciseId}
            exerciseId={screen.exerciseId}
            initialPlan={planFor(screen.exerciseId)}
            voiceEnabled={settings.voiceEnabled}
            voiceSupported={voiceSupported}
            onToggleVoice={toggleVoice}
            onBack={() => setScreen({ name: 'picker' })}
            onStart={(plan) => startWorkout(screen.exerciseId, plan)}
          />
        )}

        {screen.name === 'workout' && (
          <WorkoutScreen
            key={screen.exerciseId}
            exerciseId={screen.exerciseId}
            plan={screen.plan}
            voiceEnabled={settings.voiceEnabled}
            voiceSupported={voiceSupported}
            onToggleVoice={toggleVoice}
            onBack={() => setScreen({ name: 'setup', exerciseId: screen.exerciseId })}
            onFinish={(sets, startedAt) => finishWorkout(screen.exerciseId, screen.plan, sets, startedAt)}
          />
        )}

        {screen.name === 'summary' && (
          <SummaryScreen
            summary={screen.summary}
            saved={screen.saved}
            onAgain={() => setScreen({ name: 'setup', exerciseId: screen.summary.exerciseId })}
            onPickAnother={() => setScreen({ name: 'picker' })}
            onHistory={() => setScreen({ name: 'history' })}
          />
        )}

        {screen.name === 'routines' && (
          <RoutinesScreen
            builtIn={BUILT_IN_ROUTINES}
            custom={customRoutines}
            onStart={(routine) => setScreen({ name: 'routine-run', routine })}
            onNew={() => setScreen({ name: 'routine-edit', routine: { ...EMPTY_ROUTINE } })}
            onEdit={(routine) => setScreen({ name: 'routine-edit', routine })}
            onCopy={copyRoutine}
            onDelete={(id) => storeRoutines(customRoutines.filter((r) => r.id !== id))}
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
            onExerciseDone={(summary) => saveSession(summary)}
            onFinish={(results, completed) =>
              setScreen({ name: 'routine-summary', routine: screen.routine, results, completed })
            }
          />
        )}

        {screen.name === 'routine-summary' && (
          <RoutineSummaryScreen
            routineName={screen.routine.name}
            totalExercises={screen.routine.steps.length}
            results={screen.results}
            completed={screen.completed}
            onDone={() => setScreen({ name: 'routines' })}
            onHistory={() => setScreen({ name: 'history' })}
          />
        )}

        {screen.name === 'history' && (
          <HistoryScreen onStart={() => setScreen({ name: 'picker' })} onImported={() => setCustomRoutines(loadCustomRoutines())} />
        )}
      </main>
    </div>
  );
}

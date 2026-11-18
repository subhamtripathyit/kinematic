import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { exerciseKind, getExercise } from '../../engine/exercises';
import { VoiceCoach } from '../../engine/voice';
import { releaseMedia } from '../../engine/mediaSession';
import type { CameraFacing } from '../../engine/camera';
import { CameraPicker } from '../components/CameraPicker';
import { StartPicker } from '../components/StartPicker';
import { MAX_REST_SEC, RestAdjust } from '../components/RestAdjust';
import { VoiceToggle } from '../components/VoiceToggle';
import { FormDemo } from '../demo/FormDemo';
import setupStyles from './SetupScreen.module.css';
import type { StartMode } from '../../state/settings';
import type { Routine } from '../../state/routines';
import { buildSummary, describePlan, formatDuration, hasProgress, type SessionSummary } from '../../state/session';
import { bestSetValue, loadHistory } from '../../state/history';
import { WorkoutScreen } from './WorkoutScreen';
import styles from './RoutineRunner.module.css';

interface Props {
  routine: Routine;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  camera: CameraFacing;
  onCameraChange: (camera: CameraFacing) => void;
  startMode: StartMode;
  countdownSec: number;
  onStartModeChange: (mode: StartMode, seconds: number) => void;
  /** called after each exercise with progress, so it's saved even if the routine is stopped early */
  onExerciseDone: (summary: SessionSummary) => void;
  onFinish: (results: SessionSummary[], completed: boolean) => void;
}

/** Runs a routine: up-next screen -> exercise -> up-next -> exercise ... */
export function RoutineRunner({
  routine,
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
  camera,
  onCameraChange,
  startMode,
  countdownSec,
  onStartModeChange,
  onExerciseDone,
  onFinish,
}: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'up-next' | 'working'>('up-next');
  const [results, setResults] = useState<SessionSummary[]>([]);
  const [voice] = useState(() => new VoiceCoach(voiceEnabled));

  useEffect(() => {
    voice.setEnabled(voiceEnabled);
  }, [voice, voiceEnabled]);

  // The camera stays on between exercises; turn it off when the routine screen closes.
  useEffect(() => () => releaseMedia(), []);

  const total = routine.steps.length;
  const step = routine.steps[index];

  const goNext = (latest: SessionSummary[]) => {
    if (index + 1 >= total) {
      voice.say(t('Routine complete. Great work!'), { interrupt: true });
      onFinish(latest, true);
    } else {
      setIndex(index + 1);
      setPhase('up-next');
    }
  };

  if (!step) return null;
  const def = getExercise(step.exerciseId);

  if (phase === 'up-next') {
    return (
      <UpNext
        key={index}
        routine={routine}
        index={index}
        voice={voice}
        voiceEnabled={voiceEnabled}
        voiceSupported={voiceSupported}
        onToggleVoice={onToggleVoice}
        camera={camera}
        onCameraChange={onCameraChange}
        startMode={startMode}
        countdownSec={countdownSec}
        onStartModeChange={onStartModeChange}
        onStart={() => setPhase('working')}
        onSkip={() => goNext(results)}
        onEnd={() => onFinish(results, false)}
      />
    );
  }

  return (
    <WorkoutScreen
      key={`${routine.id}-${index}`}
      exerciseId={step.exerciseId}
      plan={step.plan}
      camera={camera}
      keepMediaAlive
      startMode={startMode}
      countdownSec={countdownSec}
      voiceEnabled={voiceEnabled}
      voiceSupported={voiceSupported}
      onToggleVoice={onToggleVoice}
      previousBest={bestSetValue(loadHistory(), step.exerciseId)}
      contextLabel={t('{routine} · exercise {n} of {total}', { routine: t(routine.name), n: index + 1, total })}
      endLabel={index + 1 >= total ? t('Finish routine') : t('Finish exercise')}
      backLabel={t('End routine')}
      onBack={() => onFinish(results, false)}
      onFinish={(sets, startedAt) => {
        const summary = buildSummary(
          { id: def.id, name: def.name, kind: exerciseKind(def) },
          step.plan,
          startedAt,
          sets,
          { id: routine.id, name: routine.name },
        );
        if (hasProgress(summary.totals)) onExerciseDone(summary);
        const latest = [...results, summary];
        setResults(latest);
        goNext(latest);
      }}
    />
  );
}

interface UpNextProps {
  routine: Routine;
  index: number;
  voice: VoiceCoach;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  camera: CameraFacing;
  onCameraChange: (camera: CameraFacing) => void;
  startMode: StartMode;
  countdownSec: number;
  onStartModeChange: (mode: StartMode, seconds: number) => void;
  onStart: () => void;
  onSkip: () => void;
  onEnd: () => void;
}

function UpNext({
  routine,
  index,
  voice,
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
  camera,
  onCameraChange,
  startMode,
  countdownSec,
  onStartModeChange,
  onStart,
  onSkip,
  onEnd,
}: UpNextProps) {
  const step = routine.steps[index];
  const def = getExercise(step.exerciseId);
  const kind = exerciseKind(def);
  const isFirst = index === 0;
  // First exercise waits for the user; later ones start after the rest between exercises.
  const autoStart = !isFirst && routine.restBetweenSec > 0;
  const [remaining, setRemaining] = useState(routine.restBetweenSec);
  const [showDemo, setShowDemo] = useState(false);
  // when the rest between exercises ends; the −10s/+10s buttons move it
  const endsAtRef = useRef(0);
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onStartRef.current = onStart;
  });

  useEffect(() => {
    const planWords =
      kind === 'hold'
        ? t('{sets} sets of {target} seconds', { sets: step.plan.sets, target: step.plan.target })
        : t('{sets} sets of {target}', { sets: step.plan.sets, target: step.plan.target });
    voice.say(`${isFirst ? t('First up') : t('Next up')}: ${t(def.name)}. ${planWords}.`, { interrupt: true });
  }, [voice, def.name, isFirst, kind, step.plan.sets, step.plan.target]);

  useEffect(() => {
    if (!isFirst && routine.restBetweenSec === 0) {
      onStartRef.current();
      return;
    }
    if (!autoStart) return;
    endsAtRef.current = Date.now() + routine.restBetweenSec * 1000;
    let last = -1;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      if (left !== last) {
        last = left;
        setRemaining(left);
        if (left > 0 && left <= 3) voice.say(String(left), { interrupt: true });
      }
      if (left === 0) {
        window.clearInterval(id);
        onStartRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [autoStart, isFirst, routine.restBetweenSec, voice]);

  return (
    <section className={styles.card}>
      <div className={styles.topRow}>
        <p className={styles.context}>
          {t(routine.name)} · exercise {index + 1} of {routine.steps.length}
        </p>
      </div>
      <p className={styles.label}>{isFirst ? t('First up') : t('Up next')}</p>
      <h1 className={styles.title}>{t(def.name)}</h1>
      <p className={styles.plan}>
        {describePlan(kind, step.plan)}
        {kind === 'hold' ? ' (timed)' : ' reps'} · {step.plan.restSec}s rest between sets
      </p>
      <p className={styles.muted}>{t(def.setupHint)}</p>
      <div>
        <button className={setupStyles.demoButton} onClick={() => setShowDemo((v) => !v)} aria-expanded={showDemo}>
          {showDemo ? t('Hide demo') : t('How to do it')}
        </button>
      </div>
      {showDemo && <FormDemo exerciseId={step.exerciseId} speakOnOpen={voiceEnabled && voiceSupported} />}

      {autoStart && (
        <div className={styles.countdown}>
          <span className={styles.time}>{formatDuration(remaining)}</span>
          <span className={styles.muted}>{t('rest, then it starts on its own')}</span>
          <RestAdjust
            onAdjust={(d) => {
              const now = Date.now();
              const left = Math.max(0, endsAtRef.current - now) + d * 1000;
              endsAtRef.current = now + Math.min(Math.max(left, 0), MAX_REST_SEC * 1000);
              setRemaining(Math.ceil(Math.max(0, endsAtRef.current - now) / 1000));
            }}
          />
        </div>
      )}

      {isFirst && <CameraPicker value={camera} onChange={onCameraChange} />}
      {isFirst && <StartPicker mode={startMode} seconds={countdownSec} onChange={onStartModeChange} />}
      <VoiceToggle enabled={voiceEnabled} supported={voiceSupported} onToggle={onToggleVoice} />

      <div className={styles.actions}>
        <button className="btn-primary" onClick={onStart}>
          {isFirst ? t('Start routine') : t('Start now')}
        </button>
        <button className="btn-secondary" onClick={onSkip}>
          {t('Skip this exercise')}
        </button>
      </div>
      <button className={styles.link} onClick={onEnd}>
        {t('End routine')}
      </button>
    </section>
  );
}

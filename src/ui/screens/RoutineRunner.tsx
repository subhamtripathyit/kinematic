import { useEffect, useRef, useState } from 'react';
import { exerciseKind, getExercise } from '../../engine/exercises';
import { VoiceCoach } from '../../engine/voice';
import type { CameraFacing } from '../../engine/camera';
import { CameraPicker } from '../components/CameraPicker';
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

  const total = routine.steps.length;
  const step = routine.steps[index];

  const goNext = (latest: SessionSummary[]) => {
    if (index + 1 >= total) {
      voice.say('Routine complete. Great work!', { interrupt: true });
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
      voiceEnabled={voiceEnabled}
      voiceSupported={voiceSupported}
      onToggleVoice={onToggleVoice}
      previousBest={bestSetValue(loadHistory(), step.exerciseId)}
      contextLabel={`${routine.name} · exercise ${index + 1} of ${total}`}
      endLabel={index + 1 >= total ? 'Finish routine' : 'Finish exercise'}
      backLabel="End routine"
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
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onStartRef.current = onStart;
  });

  useEffect(() => {
    const planWords =
      kind === 'hold'
        ? `${step.plan.sets} sets of ${step.plan.target} seconds`
        : `${step.plan.sets} sets of ${step.plan.target}`;
    voice.say(`${isFirst ? 'First up' : 'Next up'}: ${def.name}. ${planWords}.`, { interrupt: true });
  }, [voice, def.name, isFirst, kind, step.plan.sets, step.plan.target]);

  useEffect(() => {
    if (!isFirst && routine.restBetweenSec === 0) {
      onStartRef.current();
      return;
    }
    if (!autoStart) return;
    const endsAt = Date.now() + routine.restBetweenSec * 1000;
    let last = -1;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
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
          {routine.name} · exercise {index + 1} of {routine.steps.length}
        </p>
        {voiceSupported && (
          <button className={styles.mute} onClick={onToggleVoice}>
            {voiceEnabled ? 'Mute' : 'Unmute'}
          </button>
        )}
      </div>
      <p className={styles.label}>{isFirst ? 'First up' : 'Up next'}</p>
      <h1 className={styles.title}>{def.name}</h1>
      <p className={styles.plan}>
        {describePlan(kind, step.plan)}
        {kind === 'hold' ? ' (timed)' : ' reps'} · {step.plan.restSec}s rest between sets
      </p>
      <p className={styles.muted}>{def.setupHint}</p>
      {isFirst && <CameraPicker value={camera} onChange={onCameraChange} />}

      {autoStart && (
        <div className={styles.countdown}>
          <span className={styles.time}>{formatDuration(remaining)}</span>
          <span className={styles.muted}>rest, then it starts on its own</span>
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn-primary" onClick={onStart}>
          {isFirst ? 'Start routine' : 'Start now'}
        </button>
        <button className="btn-secondary" onClick={onSkip}>
          Skip this exercise
        </button>
      </div>
      <button className={styles.link} onClick={onEnd}>
        End routine
      </button>
    </section>
  );
}

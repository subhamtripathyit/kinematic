import { useState } from 'react';
import { CATEGORIES, getExercise, isHold } from '../../engine/exercises';
import type { WorkoutPlan } from '../../state/workoutSession';
import styles from './SetupScreen.module.css';

interface Props {
  exerciseId: string;
  initialPlan: WorkoutPlan;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  onStart: (plan: WorkoutPlan) => void;
  onBack: () => void;
}

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180];

/** Choose sets, target and rest before starting. */
export function SetupScreen({ exerciseId, initialPlan, voiceEnabled, voiceSupported, onToggleVoice, onStart, onBack }: Props) {
  const exercise = getExercise(exerciseId);
  const hold = isHold(exercise);
  const category = CATEGORIES.find((c) => c.id === exercise.category)?.label;

  const [mode, setMode] = useState<WorkoutPlan['mode']>(initialPlan.mode);
  const [sets, setSets] = useState(String(initialPlan.sets));
  const [target, setTarget] = useState(String(initialPlan.target));
  const [rest, setRest] = useState(initialPlan.restSec);
  const [error, setError] = useState<string | null>(null);

  const limits = hold ? { min: 5, max: 600 } : { min: 1, max: 100 };

  const start = () => {
    if (mode === 'free') {
      // Keep the last sets/target so switching back to "Sets & reps" remembers them.
      onStart({ mode: 'free', sets: initialPlan.sets, target: initialPlan.target, restSec: 0 });
      return;
    }
    const s = Number(sets);
    const t = Number(target);
    if (!Number.isInteger(s) || s < 1 || s > 10) {
      setError('Sets must be a whole number from 1 to 10.');
      return;
    }
    if (!Number.isInteger(t) || t < limits.min || t > limits.max) {
      setError(
        hold
          ? `Hold time must be a whole number from ${limits.min} to ${limits.max} seconds.`
          : `Reps must be a whole number from ${limits.min} to ${limits.max}.`,
      );
      return;
    }
    onStart({ mode: 'plan', sets: s, target: t, restSec: rest });
  };

  return (
    <section className={styles.card}>
      <div>
        <p className={styles.eyebrow}>
          {category} · {exercise.cameraView === 'side' ? 'Side view' : 'Front view'}
          {hold ? ' · Timed hold' : ''}
        </p>
        <h1 className={styles.title}>{exercise.name}</h1>
        <p className={styles.hint}>{exercise.setupHint}</p>
      </div>

      <div className={styles.modes} role="radiogroup" aria-label="Workout type">
        <button
          role="radio"
          aria-checked={mode === 'plan'}
          className={`${styles.mode} ${mode === 'plan' ? styles.modeActive : ''}`}
          onClick={() => setMode('plan')}
        >
          <span className={styles.modeTitle}>Sets &amp; {hold ? 'time' : 'reps'}</span>
          <span className={styles.modeHint}>
            {hold ? 'e.g. 3 holds of 30 seconds' : 'e.g. 3 sets of 10'}, with a rest timer
          </span>
        </button>
        <button
          role="radio"
          aria-checked={mode === 'free'}
          className={`${styles.mode} ${mode === 'free' ? styles.modeActive : ''}`}
          onClick={() => {
            setMode('free');
            setError(null);
          }}
        >
          <span className={styles.modeTitle}>Free workout</span>
          <span className={styles.modeHint}>{hold ? 'Hold as long as you can' : 'As many reps as you want'}, no target</span>
        </button>
      </div>

      {mode === 'free' ? (
        <p className={styles.freeNote}>
          {hold ? 'The timer runs as long as your form is good.' : 'Every rep is counted, with no limit.'} Press{' '}
          <strong>Finish set</strong> to log a set and start the next one, and <strong>End workout</strong> when
          you're done.
        </p>
      ) : (
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Sets</span>
          <input
            type="number"
            min={1}
            max={10}
            value={sets}
            onChange={(e) => {
              setSets(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className={styles.field}>
          <span>{hold ? 'Seconds per set' : 'Reps per set'}</span>
          <input
            type="number"
            min={limits.min}
            max={limits.max}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className={styles.field}>
          <span>Rest between sets</span>
          <select value={rest} onChange={(e) => setRest(Number(e.target.value))}>
            {REST_OPTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 0 ? 'No rest' : `${sec} seconds`}
              </option>
            ))}
          </select>
        </label>
      </div>
      )}

      <label className={styles.toggle}>
        <input type="checkbox" checked={voiceEnabled && voiceSupported} disabled={!voiceSupported} onChange={onToggleVoice} />
        <span>
          Voice coach
          <span className={styles.toggleHint}>
            {voiceSupported
              ? 'Reads out your rep count, tips like "Go deeper" and the rest countdown.'
              : 'Not supported in this browser. Use Chrome or Edge.'}
          </span>
        </span>
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn-primary" onClick={start}>
          Start workout
        </button>
      </div>
    </section>
  );
}

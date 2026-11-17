import { useState } from 'react';
import { exerciseKind, exercisesByCategory, getExercise } from '../../engine/exercises';
import { newRoutineId, type Routine } from '../../state/routines';
import styles from './RoutineEditor.module.css';

interface Props {
  /** routine to edit; a new routine has no steps yet */
  initial: Routine;
  onSave: (routine: Routine) => void;
  onCancel: () => void;
}

interface DraftStep {
  key: string;
  exerciseId: string;
  sets: string;
  target: string;
  restSec: number;
}

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180];
const isHoldId = (id: string) => exerciseKind(getExercise(id)) === 'hold';
let keyCounter = 0;
const nextKey = () => `step-${++keyCounter}`;

/** Create or edit a custom routine. */
export function RoutineEditor({ initial, onSave, onCancel }: Props) {
  const groups = exercisesByCategory();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [restBetween, setRestBetween] = useState(initial.restBetweenSec);
  const [steps, setSteps] = useState<DraftStep[]>(() =>
    initial.steps.map((s) => ({
      key: nextKey(),
      exerciseId: s.exerciseId,
      sets: String(s.plan.sets),
      target: String(s.plan.target),
      restSec: s.plan.restSec,
    })),
  );
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<DraftStep>) => {
    setSteps((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setError(null);
  };

  const changeExercise = (key: string, exerciseId: string) => {
    const step = steps.find((s) => s.key === key);
    if (!step) return;
    // Switching between a counted and a timed exercise: reset the target to a sensible default.
    const kindChanged = isHoldId(step.exerciseId) !== isHoldId(exerciseId);
    update(key, { exerciseId, ...(kindChanged ? { target: isHoldId(exerciseId) ? '30' : '10' } : {}) });
  };

  const move = (index: number, delta: number) => {
    setSteps((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addStep = () => {
    setSteps((list) => [...list, { key: nextKey(), exerciseId: 'squat', sets: '3', target: '10', restSec: 60 }]);
    setError(null);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give your routine a name.');
    if (trimmed.length > 40) return setError('Keep the name under 40 characters.');
    if (steps.length === 0) return setError('Add at least one exercise.');
    if (steps.length > 15) return setError('A routine can have at most 15 exercises.');

    for (const [i, s] of steps.entries()) {
      const sets = Number(s.sets);
      const target = Number(s.target);
      const hold = isHoldId(s.exerciseId);
      if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
        return setError(`Exercise ${i + 1}: sets must be a whole number from 1 to 10.`);
      }
      const [min, max] = hold ? [5, 600] : [1, 100];
      if (!Number.isInteger(target) || target < min || target > max) {
        return setError(`Exercise ${i + 1}: ${hold ? 'seconds' : 'reps'} must be a whole number from ${min} to ${max}.`);
      }
    }

    onSave({
      id: initial.id || newRoutineId(),
      name: trimmed,
      description: description.trim() || undefined,
      restBetweenSec: restBetween,
      steps: steps.map((s) => ({
        exerciseId: s.exerciseId,
        plan: { mode: 'plan', sets: Number(s.sets), target: Number(s.target), restSec: s.restSec },
      })),
    });
  };

  return (
    <section className={styles.card}>
      <h1 className={styles.title}>{initial.id ? 'Edit routine' : initial.steps.length ? 'Customize routine' : 'New routine'}</h1>

      <div className={styles.row}>
        <label className={styles.field}>
          <span>Name</span>
          <input
            value={name}
            maxLength={40}
            placeholder="e.g. Monday legs"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className={styles.field}>
          <span>Rest between exercises</span>
          <select value={restBetween} onChange={(e) => setRestBetween(Number(e.target.value))}>
            {REST_OPTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 0 ? 'No rest' : `${sec} seconds`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.field}>
        <span>Description (optional)</span>
        <input value={description} maxLength={100} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className={styles.steps}>
        <h2 className={styles.subtitle}>Exercises</h2>
        {steps.length === 0 && <p className={styles.muted}>No exercises yet.</p>}
        {steps.map((s, i) => {
          const hold = isHoldId(s.exerciseId);
          return (
            <div key={s.key} className={styles.step}>
              <span className={styles.index}>{i + 1}</span>
              <label className={`${styles.field} ${styles.grow}`}>
                <span>Exercise</span>
                <select value={s.exerciseId} onChange={(e) => changeExercise(s.key, e.target.value)}>
                  {groups.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {g.exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                          {ex.kind === 'hold' ? ' (timed)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className={`${styles.field} ${styles.small}`}>
                <span>Sets</span>
                <input type="number" min={1} max={10} value={s.sets} onChange={(e) => update(s.key, { sets: e.target.value })} />
              </label>
              <label className={`${styles.field} ${styles.small}`}>
                <span>{hold ? 'Seconds' : 'Reps'}</span>
                <input type="number" value={s.target} onChange={(e) => update(s.key, { target: e.target.value })} />
              </label>
              <label className={`${styles.field} ${styles.small}`}>
                <span>Rest</span>
                <select value={s.restSec} onChange={(e) => update(s.key, { restSec: Number(e.target.value) })}>
                  {REST_OPTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}s
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.stepButtons}>
                <button className={styles.iconButton} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button className={styles.iconButton} onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button
                  className={styles.iconButton}
                  onClick={() => setSteps((list) => list.filter((x) => x.key !== s.key))}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        <button className="btn-secondary" onClick={addStep}>
          + Add exercise
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save}>
          Save routine
        </button>
      </div>
    </section>
  );
}

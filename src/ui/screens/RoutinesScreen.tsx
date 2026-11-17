import { useState } from 'react';
import { exerciseKind, EXERCISES } from '../../engine/exercises';
import { describePlan } from '../../state/session';
import type { Routine } from '../../state/routines';
import styles from './RoutinesScreen.module.css';

interface Props {
  builtIn: Routine[];
  custom: Routine[];
  onStart: (routine: Routine) => void;
  onNew: () => void;
  onEdit: (routine: Routine) => void;
  onCopy: (routine: Routine) => void;
  onDelete: (id: string) => void;
}

/** List of routines: built-in ones and the user's own. */
export function RoutinesScreen({ builtIn, custom, onStart, onNew, onEdit, onCopy, onDelete }: Props) {
  return (
    <section className={styles.screen}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Routines</h1>
          <p className={styles.muted}>
            A routine runs several exercises back to back, with rest in between. For a single exercise, use the
            Exercises tab.
          </p>
        </div>
        <button className="btn-primary" onClick={onNew}>
          New routine
        </button>
      </div>

      <h2 className={styles.groupTitle}>My routines</h2>
      {custom.length === 0 ? (
        <p className={styles.muted}>
          You haven't made any yet. Create one, or press <strong>Customize</strong> on a built-in routine to make your
          own version of it.
        </p>
      ) : (
        <div className={styles.grid}>
          {custom.map((r) => (
            <RoutineCard key={r.id} routine={r} onStart={onStart} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
          ))}
        </div>
      )}

      <h2 className={styles.groupTitle}>Built-in</h2>
      <div className={styles.grid}>
        {builtIn.map((r) => (
          <RoutineCard key={r.id} routine={r} onStart={onStart} onCopy={onCopy} />
        ))}
      </div>
    </section>
  );
}

function RoutineCard({
  routine,
  onStart,
  onEdit,
  onCopy,
  onDelete,
}: {
  routine: Routine;
  onStart: (r: Routine) => void;
  onEdit?: (r: Routine) => void;
  onCopy: (r: Routine) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const steps = routine.steps
    .map((s) => {
      const def = EXERCISES.find((e) => e.id === s.exerciseId);
      return def ? `${def.name} ${describePlan(exerciseKind(def), s.plan)}` : null;
    })
    .filter((x): x is string => x !== null);

  return (
    <div className={styles.card}>
      <div>
        <h3 className={styles.name}>{routine.name}</h3>
        {routine.description && <p className={styles.muted}>{routine.description}</p>}
      </div>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className={styles.meta}>
        {steps.length} exercise{steps.length === 1 ? '' : 's'} · {routine.restBetweenSec}s rest between exercises
      </p>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => onStart(routine)} disabled={steps.length === 0}>
          Start
        </button>
        {onEdit && (
          <button className="btn-secondary" onClick={() => onEdit(routine)}>
            Edit
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={() => onCopy(routine)}
          title={
            routine.builtIn
              ? 'Built-in routines stay as they are. This makes your own version that you can change.'
              : 'Make a duplicate of this routine'
          }
        >
          {routine.builtIn ? 'Customize' : 'Duplicate'}
        </button>
      </div>
      {onDelete &&
        (confirming ? (
          <div className={styles.confirm}>
            <span>Delete this routine?</span>
            <button className={styles.link} onClick={() => onDelete(routine.id)}>
              Yes, delete
            </button>
            <button className={styles.link} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className={styles.link} onClick={() => setConfirming(true)}>
            Delete
          </button>
        ))}
    </div>
  );
}

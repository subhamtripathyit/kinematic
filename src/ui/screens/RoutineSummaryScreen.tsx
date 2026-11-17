import { formScore, describePlan, describeStats, formatDuration, hasProgress, type SessionSummary } from '../../state/session';
import styles from './SummaryScreen.module.css';

interface Props {
  routineName: string;
  totalExercises: number;
  results: SessionSummary[];
  completed: boolean;
  onDone: () => void;
  onHistory: () => void;
}

export function RoutineSummaryScreen({ routineName, totalExercises, results, completed, onDone, onHistory }: Props) {
  const done = results.filter((r) => hasProgress(r.totals));
  const totalSec = results.reduce((sum, r) => sum + r.durationSec, 0);
  const scores = done.map((r) => formScore(r.kind, r.totals)).filter((s): s is number => s !== null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <section className={styles.card}>
      <div>
        <h1 className={styles.title}>
          {routineName}: {completed ? 'routine complete' : 'routine ended early'}
        </h1>
        <p className={styles.muted}>
          {done.length} of {totalExercises} exercises done
          {done.length > 0 && (
            <>
              {' · '}
              <button className={styles.inlineLink} onClick={onHistory}>
                saved to history
              </button>
            </>
          )}
        </p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.value}>{done.length}</span>
          <span className={styles.label}>Exercises done</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.value}>{avgScore ?? '–'}</span>
          <span className={styles.label}>Avg form score</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.value}>{formatDuration(totalSec)}</span>
          <span className={styles.label}>Exercise time</span>
        </div>
      </div>

      {results.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Plan</th>
              <th>Done</th>
              <th>Form score</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.exerciseName}</td>
                <td>{describePlan(r.kind, r.plan)}</td>
                <td>{hasProgress(r.totals) ? `${describeStats(r.kind, r.totals)} in ${r.sets.length} sets` : 'skipped'}</td>
                <td>{formScore(r.kind, r.totals) ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.actions}>
        <button className="btn-primary" onClick={onDone}>
          Back to routines
        </button>
        <button className="btn-secondary" onClick={onHistory}>
          See history
        </button>
      </div>
    </section>
  );
}

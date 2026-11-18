import { formScore, describePlan, describeStats, formatDuration, hasProgress, type SessionSummary } from '../../state/session';
import { t } from '../../i18n';
import type { Badge } from '../../state/badges';
import { Celebrations } from '../components/Celebrations';
import { ShareButton } from '../share/ShareButton';
import styles from './SummaryScreen.module.css';

interface Props {
  routineName: string;
  totalExercises: number;
  results: SessionSummary[];
  completed: boolean;
  onDone: () => void;
  onHistory: () => void;
  newBadges?: Badge[];
  streak?: number;
}

export function RoutineSummaryScreen({
  routineName,
  totalExercises,
  results,
  completed,
  onDone,
  onHistory,
  newBadges = [],
  streak = 0,
}: Props) {
  const done = results.filter((r) => hasProgress(r.totals));
  const totalSec = results.reduce((sum, r) => sum + r.durationSec, 0);
  const scores = done.map((r) => formScore(r.kind, r.totals)).filter((s): s is number => s !== null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <section className={styles.card}>
      <div>
        <h1 className={styles.title}>
          {t(routineName)}: {completed ? 'routine complete' : 'routine ended early'}
        </h1>
        <p className={styles.muted}>
          {t('{done} of {total} exercises done', { done: done.length, total: totalExercises })}
          {done.length > 0 && (
            <>
              {' · '}
              <button className={styles.inlineLink} onClick={onHistory}>
                {t('saved to history')}
              </button>
            </>
          )}
        </p>
      </div>

      <Celebrations badges={newBadges} streak={streak} />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.value}>{done.length}</span>
          <span className={styles.label}>{t('Exercises done')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.value}>{avgScore ?? '–'}</span>
          <span className={styles.label}>{t('Avg form score')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.value}>{formatDuration(totalSec)}</span>
          <span className={styles.label}>{t('Exercise time')}</span>
        </div>
      </div>

      {results.length > 0 && (
        <div className="table-scroll">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('Exercise')}</th>
              <th>{t('Plan')}</th>
              <th>{t('Done')}</th>
              <th>{t('Form score')}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{t(r.exerciseName)}</td>
                <td>{describePlan(r.kind, r.plan)}</td>
                <td>{hasProgress(r.totals) ? t('{what} in {n} sets', { what: describeStats(r.kind, r.totals), n: r.sets.length }) : t('skipped')}</td>
                <td>{formScore(r.kind, r.totals) ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn-primary" onClick={onDone}>
          {t('Back to routines')}
        </button>
        <button className="btn-secondary" onClick={onHistory}>
          {t('See history')}
        </button>
        {done.length > 0 && (
          <ShareButton
            filename="kinematic-routine.png"
            card={{
              title: routineName,
              subtitle: completed ? t('Routine complete') : t('Routine'),
              bigValue: `${done.length}/${totalExercises}`,
              bigLabel: 'exercises done',
              stats: [
                { label: t('Avg form score'), value: avgScore === null ? '–' : String(avgScore) },
                { label: t('Exercise time'), value: formatDuration(totalSec) },
                { label: t('Day streak'), value: String(streak) },
              ],
              highlight: newBadges[0] ? t('Badge: {name}', { name: t(newBadges[0].name) }) : undefined,
            }}
          />
        )}
      </div>
    </section>
  );
}

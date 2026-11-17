import {
  avgRepSeconds,
  describeStats,
  formScore,
  formatDuration,
  sortedMistakes,
  type SessionSummary,
} from '../../state/session';
import type { Badge } from '../../state/badges';
import { Celebrations } from '../components/Celebrations';
import { ShareButton } from '../share/ShareButton';
import styles from './SummaryScreen.module.css';

interface Props {
  summary: SessionSummary;
  saved: boolean;
  onAgain: () => void;
  onPickAnother: () => void;
  onHistory: () => void;
  /** best single set before this workout (reps or hold ms) */
  previousBest?: number;
  newBadges?: Badge[];
  streak?: number;
}

export function SummaryScreen({
  summary,
  saved,
  onAgain,
  onPickAnother,
  onHistory,
  previousBest = 0,
  newBadges = [],
  streak = 0,
}: Props) {
  const { totals, kind, sets } = summary;
  const hold = kind === 'hold';
  const mistakes = sortedMistakes(totals);
  const score = formScore(kind, totals);
  const tempo = avgRepSeconds(totals);
  const bestThisTime = Math.max(0, ...sets.map((s) => (hold ? s.stats.holdMs : s.stats.reps)));
  const isPersonalBest = saved && previousBest > 0 && bestThisTime > previousBest;
  const pbText = isPersonalBest
    ? hold
      ? `${formatDuration(bestThisTime / 1000)} hold (was ${formatDuration(previousBest / 1000)})`
      : `${bestThisTime} reps in one set (was ${previousBest})`
    : undefined;

  return (
    <section className={styles.card}>
      <div>
        <h1 className={styles.title}>{summary.exerciseName}: workout complete</h1>
        <p className={styles.muted}>
          {summary.plan.mode === 'free'
            ? `Free workout · ${sets.length} set${sets.length === 1 ? '' : 's'}`
            : `${sets.length} of ${summary.plan.sets} sets done`}{' '}
          ·{' '}
          {saved ? (
            <button className={styles.inlineLink} onClick={onHistory}>
              saved to history
            </button>
          ) : (
            'not saved (nothing was recorded)'
          )}
        </p>
      </div>

      <Celebrations personalBest={pbText} badges={newBadges} streak={streak} />

      <div className={styles.stats}>
        {hold ? (
          <>
            <Stat label="Total held" value={formatDuration(totals.holdMs / 1000)} />
            <Stat label="Form score" value={score ?? '–'} hint="Share of time in position with good form" />
          </>
        ) : (
          <>
            <Stat label="Total reps" value={totals.reps} />
            <Stat label="Form score" value={score ?? '–'} hint="Average of every rep, out of 100" />
            <Stat label="Good form reps" value={totals.goodReps} />
            <Stat label="Partial reps" value={totals.partialReps} />
            <Stat label="Avg time per rep" value={tempo === null ? '–' : `${tempo.toFixed(1)}s`} />
            <Stat label="Time under tension" value={formatDuration((totals.tutMs ?? 0) / 1000)} />
          </>
        )}
        <Stat label="Workout time" value={formatDuration(summary.durationSec)} />
      </div>

      {sets.length > 0 && (
        <div>
          <h2 className={styles.subtitle}>Sets</h2>
          <div className="table-scroll">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Set</th>
                <th>{hold ? 'Held' : 'Reps'}</th>
                {!hold && <th>Good form</th>}
                {!hold && <th>Partial</th>}
                <th>Form score</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.setNumber}>
                  <td>{s.setNumber}</td>
                  <td>{hold ? describeStats('hold', s.stats) : s.stats.reps}</td>
                  {!hold && <td>{s.stats.goodReps}</td>}
                  {!hold && <td>{s.stats.partialReps}</td>}
                  <td>{formScore(kind, s.stats) ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div>
        <h2 className={styles.subtitle}>What to work on</h2>
        {mistakes.length === 0 ? (
          <p className={styles.muted}>No form issues detected. Nice work.</p>
        ) : (
          <ul className={styles.list}>
            {mistakes.map(([message, count]) => (
              <li key={message}>
                <span>{message}</span>
                <span className={styles.count}>×{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.actions}>
        <button className="btn-primary" onClick={onAgain}>
          Do it again
        </button>
        <button className="btn-secondary" onClick={onPickAnother}>
          Choose another exercise
        </button>
        {saved && (
          <ShareButton
            filename={`kinematic-${summary.exerciseId}.png`}
            card={{
              title: summary.exerciseName,
              subtitle: summary.plan.mode === 'free' ? 'Free workout' : `${sets.length} sets`,
              bigValue: hold ? formatDuration(totals.holdMs / 1000) : String(totals.reps),
              bigLabel: hold ? 'held with good form' : 'reps',
              stats: [
                { label: 'Form score', value: score === null ? '–' : String(score) },
                { label: 'Sets', value: String(sets.length) },
                { label: 'Day streak', value: String(streak) },
              ],
              highlight: isPersonalBest ? 'New personal best!' : newBadges[0] ? `Badge: ${newBadges[0].name}` : undefined,
            }}
          />
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className={styles.stat} title={hint}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

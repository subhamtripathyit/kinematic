import { computeBadges } from '../../state/badges';
import { t } from '../../i18n';
import { currentStreak, heatmap, longestStreak, workoutsThisWeek } from '../../state/progress';
import type { SessionSummary } from '../../state/session';
import styles from './ProgressOverview.module.css';

interface Props {
  history: SessionSummary[];
  weeklyGoal: number;
  onWeeklyGoalChange: (goal: number) => void;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

/** Streak, weekly goal, 12-week calendar and badges, at the top of History. */
export function ProgressOverview({ history, weeklyGoal, onWeeklyGoalChange }: Props) {
  const streak = currentStreak(history);
  const best = longestStreak(history);
  const thisWeek = workoutsThisWeek(history);
  const weeks = heatmap(history, 12);
  const badges = computeBadges(history);
  const earned = badges.filter((b) => b.earned).length;
  const pct = Math.min(100, Math.round((thisWeek / weeklyGoal) * 100));

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.big}>🔥 {streak}</span>
          <span className={styles.label}>day streak · best {best}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.big}>
            {thisWeek}/{weeklyGoal}
          </span>
          <span className={styles.label}>
            workout days this week ·{' '}
            <label className={styles.goal}>
              goal{' '}
              <select value={weeklyGoal} onChange={(e) => onWeeklyGoalChange(Number(e.target.value))} aria-label={t('Weekly goal')}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </span>
          <div className={styles.progress} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          {thisWeek >= weeklyGoal && <span className={styles.done}>{t('Weekly goal reached!')}</span>}
        </div>
        <div className={styles.card}>
          <span className={styles.big}>
            {earned}/{badges.length}
          </span>
          <span className={styles.label}>{t('badges earned')}</span>
        </div>
      </div>

      <div>
        <h2 className={styles.subtitle}>{t('Last 12 weeks')}</h2>
        <div className={styles.heatWrap}>
          <div className={styles.dayLabels}>
            {DAY_LABELS.map((d, i) => (
              <span key={i}>{d ? t(d) : ''}</span>
            ))}
          </div>
          <div className={styles.heat}>
            {weeks.map((col, w) => (
              <div key={w} className={styles.col}>
                {col.map((cell) => (
                  <span
                    key={cell.date}
                    className={`${styles.cell} ${cell.future ? styles.future : ''}`}
                    data-level={Math.min(3, cell.count)}
                    title={t('{date}: {n} exercises', { date: cell.date, n: cell.count })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className={styles.subtitle}>{t('Badges')}</h2>
        <div className={styles.badges}>
          {badges.map((b) => (
            <div key={b.id} className={`${styles.badge} ${b.earned ? styles.earned : ''}`} title={t(b.description)}>
              <span className={styles.badgeIcon} aria-hidden="true">
                {b.earned ? '★' : '☆'}
              </span>
              <span className={styles.badgeName}>{t(b.name)}</span>
              <span className={styles.badgeDesc}>{t(b.description)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

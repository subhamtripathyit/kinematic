import { t } from '../../i18n';
import type { Badge } from '../../state/badges';
import styles from './Celebrations.module.css';

/** Personal best + newly unlocked badges, shown on the summary screens. */
export function Celebrations({ personalBest, badges, streak }: { personalBest?: string; badges: Badge[]; streak: number }) {
  if (!personalBest && badges.length === 0 && streak < 2) return null;
  return (
    <div className={styles.wrap}>
      {personalBest && <div className={styles.pb}>{t('New personal best: {what}', { what: personalBest })}</div>}
      {streak >= 2 && <div className={styles.streak}>🔥 {t('{n}-day streak', { n: streak })}</div>}
      {badges.map((b) => (
        <div key={b.id} className={styles.badge}>
          <span className={styles.badgeIcon} aria-hidden="true">
            ★
          </span>
          <span>
            <strong>{t('Badge unlocked: {name}', { name: t(b.name) })}</strong>
            <span className={styles.badgeDesc}>{t(b.description)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

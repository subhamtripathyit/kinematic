import styles from './RepCounter.module.css';
import { t } from '../../i18n';

/** Big number on the workout screen: reps (7 / 10) or time held (0:21 / 0:30). */
export function RepCounter({
  value,
  target,
  label,
  sides,
}: {
  value: number | string;
  target?: number | string;
  label: string;
  /** alternating exercises: reps per side */
  sides?: { left: number; right: number };
}) {
  return (
    <div className={styles.box}>
      <div className={styles.main}>
        <span className={styles.number}>{value}</span>
        {target !== undefined && <span className={styles.target}>/ {target}</span>}
        <span className={styles.label}>{t(label)}</span>
      </div>
      {sides && (
        <div className={styles.sides}>
          <span>
            {t('Left')} <strong>{sides.left}</strong>
          </span>
          <span>
            {t('Right')} <strong>{sides.right}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

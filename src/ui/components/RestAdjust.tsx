import { t } from '../../i18n';
import styles from './RestAdjust.module.css';

/** Seconds added or removed per tap. */
export const REST_STEP_SEC = 10;
/** A rest can't be stretched past this. */
export const MAX_REST_SEC = 600;

interface Props {
  onAdjust: (deltaSec: number) => void;
}

/** "−10s / +10s" buttons on a rest timer. */
export function RestAdjust({ onAdjust }: Props) {
  return (
    <div className={styles.row}>
      <button className={styles.button} onClick={() => onAdjust(-REST_STEP_SEC)} aria-label={t('Rest 10 seconds less')}>
        −10s
      </button>
      <button className={styles.button} onClick={() => onAdjust(REST_STEP_SEC)} aria-label={t('Rest 10 seconds more')}>
        +10s
      </button>
    </div>
  );
}

import { COUNTDOWN_OPTIONS, type StartMode } from '../../state/settings';
import { t } from '../../i18n';
import styles from './CameraPicker.module.css';

interface Props {
  mode: StartMode;
  seconds: number;
  onChange: (mode: StartMode, seconds: number) => void;
}

/** How each set starts: countdown (default) or automatically when you're in position. */
export function StartPicker({ mode, seconds, onChange }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.label}>{t('Start each set')}</span>
        <div className={styles.toggle} role="radiogroup" aria-label={t('How each set starts')}>
          <button
            role="radio"
            aria-checked={mode === 'countdown'}
            className={`${styles.option} ${mode === 'countdown' ? styles.active : ''}`}
            onClick={() => onChange('countdown', seconds)}
          >
            Countdown
          </button>
          <button
            role="radio"
            aria-checked={mode === 'position'}
            className={`${styles.option} ${mode === 'position' ? styles.active : ''}`}
            onClick={() => onChange('position', seconds)}
          >
            When I'm in position
          </button>
        </div>
      </div>
      {mode === 'countdown' ? (
        <div className={styles.row}>
          <span className={styles.label}>{t('Countdown length')}</span>
          <div className={styles.toggle} role="radiogroup" aria-label={t('Countdown length')}>
            {COUNTDOWN_OPTIONS.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={seconds === s}
                className={`${styles.option} ${seconds === s ? styles.active : ''}`}
                onClick={() => onChange('countdown', s)}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.tip}>
          {t('Counting starts once the camera sees your whole body in the starting position, after a quick 3-2-1.')}
        </p>
      )}
    </div>
  );
}

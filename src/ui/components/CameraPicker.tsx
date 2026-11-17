import type { CameraFacing } from '../../engine/camera';
import styles from './CameraPicker.module.css';

const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** Front / back camera choice, plus framing tips for phones. */
export function CameraPicker({ value, onChange }: { value: CameraFacing; onChange: (v: CameraFacing) => void }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.label}>Camera</span>
        <div className={styles.toggle} role="radiogroup" aria-label="Camera">
          {(
            [
              ['user', 'Front'],
              ['environment', 'Back'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="radio"
              aria-checked={value === id}
              className={`${styles.option} ${value === id ? styles.active : ''}`}
              onClick={() => onChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {isTouchDevice() && (
        <p className={styles.tip}>
          <strong>On a phone:</strong> hold it upright (portrait), propped at about hip height, and stand 2.5–3 m away
          so your head and feet both fit. The back camera usually has a wider, sharper view. Laptops just use the
          webcam.
        </p>
      )}
    </div>
  );
}

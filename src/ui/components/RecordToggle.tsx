import { t } from '../../i18n';
import { recordingSupported } from '../../engine/recorder';
import styles from '../screens/SetupScreen.module.css';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/** "Record this session", asked before a workout starts. Off by default. */
export function RecordToggle({ enabled, onChange }: Props) {
  const supported = recordingSupported();
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={enabled && supported} disabled={!supported} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {t('Record this session')}
        <span className={styles.toggleHint}>
          {supported
            ? t('Saves a video with your reps, angles and form tips on it. It stays on your device: you download it at the end.')
            : t('Recording is not supported in this browser.')}
        </span>
      </span>
    </label>
  );
}

import { t } from '../../i18n';
import styles from '../screens/SetupScreen.module.css';

interface Props {
  enabled: boolean;
  supported: boolean;
  onToggle: () => void;
}

/** "Voice coach" on/off, shown before a single exercise and before a routine. */
export function VoiceToggle({ enabled, supported, onToggle }: Props) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={enabled && supported} disabled={!supported} onChange={onToggle} />
      <span>
        {t('Voice coach')}
        <span className={styles.toggleHint}>
          {supported
            ? t('Reads out your rep count, tips like "Go deeper" and the rest countdown.')
            : t('Not supported in this browser. Use Chrome or Edge.')}
        </span>
      </span>
    </label>
  );
}

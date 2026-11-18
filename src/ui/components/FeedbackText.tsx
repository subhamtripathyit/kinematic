import { t } from '../../i18n';
import type { Feedback } from '../../engine/types';
import styles from './FeedbackText.module.css';

export function FeedbackText({ feedback }: { feedback: Feedback | null }) {
  return (
    <div className={`${styles.box} ${feedback ? styles[feedback.level] : styles.empty}`} aria-live="polite">
      {feedback ? t(feedback.message) : t('Start moving. Tips will show up here.')}
    </div>
  );
}

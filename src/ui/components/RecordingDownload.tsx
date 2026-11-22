import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { sessionRecorder, type Recording } from '../../engine/recorder';
import { formatDuration } from '../../state/session';
import styles from './RecordingDownload.module.css';

/** Shown after a recorded workout: finishes the video and offers it as a download. */
export function RecordingDownload() {
  const [state, setState] = useState<{ status: 'working' } | { status: 'done'; recording: Recording | null }>({ status: 'working' });

  useEffect(() => {
    let alive = true;
    sessionRecorder
      .stop()
      .then((recording) => alive && setState({ status: 'done', recording }))
      .catch(() => alive && setState({ status: 'done', recording: null }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'working') {
    return <div className={styles.card}>{t('Preparing your video…')}</div>;
  }
  const rec = state.recording;
  if (!rec) {
    return <div className={styles.card}>{t('Nothing was recorded.')}</div>;
  }
  const mb = (rec.sizeBytes / 1_000_000).toFixed(1);
  return (
    <div className={styles.card}>
      <div>
        <p className={styles.title}>{t('Your recording')}</p>
        <p className={styles.muted}>
          {formatDuration(Math.round(rec.durationMs / 1000))} · {mb} MB ·{' '}
          {t("It isn't saved anywhere else: download it before you leave this screen.")}
        </p>
        {rec.soundBlocked && (
          <p className={styles.muted}>{t("The microphone wasn't allowed, so this video has no sound.")}</p>
        )}
      </div>
      <a className="btn-primary" href={rec.url} download={rec.fileName}>
        {t('Download video')}
      </a>
    </div>
  );
}

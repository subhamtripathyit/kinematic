import { useState } from 'react';
import { APP_URL, makeShareImage, shareOrDownload, type CardData } from './shareCard';

/** "Share" button: makes the stats image and shares or downloads it. */
export function ShareButton({ card, filename }: { card: CardData; filename: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await makeShareImage(card);
      const result = await shareOrDownload(blob, filename, `${card.title}: ${card.bigValue} ${card.bigLabel} on Kinematic. ${APP_URL}`);
      if (result === 'downloaded') setStatus('Image downloaded. Post it anywhere!');
      if (result === 'shared') setStatus('Shared!');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create the image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <button className="btn-secondary" onClick={onClick} disabled={busy}>
        {busy ? 'Making image…' : 'Share'}
      </button>
      {status && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{status}</span>}
    </div>
  );
}

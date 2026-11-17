/** What goes on the share image. Never includes the camera picture, only stats. */
export interface CardData {
  title: string;
  subtitle: string;
  bigValue: string;
  bigLabel: string;
  stats: { label: string; value: string }[];
  highlight?: string;
}

export const APP_URL = 'kinematic-one.vercel.app';

/** Draws a 1080 x 1080 PNG for Instagram / X / WhatsApp. */
export async function makeShareImage(d: CardData): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  const font = (weight: number, px: number) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // background
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, 0, size, 14);

  // brand
  ctx.fillStyle = '#e8eaf0';
  ctx.font = font(800, 44);
  ctx.textBaseline = 'top';
  ctx.fillText('KINEMATIC', 80, 80);

  // title
  ctx.fillStyle = '#9aa3b2';
  ctx.font = font(500, 40);
  ctx.fillText(d.subtitle, 80, 190);
  ctx.fillStyle = '#e8eaf0';
  ctx.font = font(800, 72);
  fitText(ctx, d.title, 80, 245, size - 160);

  // big number
  ctx.fillStyle = '#38bdf8';
  ctx.font = font(800, 220);
  ctx.fillText(d.bigValue, 72, 360);
  ctx.fillStyle = '#9aa3b2';
  ctx.font = font(500, 44);
  ctx.fillText(d.bigLabel, 80, 600);

  // highlight (personal best / badge)
  if (d.highlight) {
    ctx.font = font(700, 38);
    const w = ctx.measureText(d.highlight).width + 56;
    roundRect(ctx, 80, 670, w, 70, 35);
    ctx.fillStyle = '#3b2f0b';
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(d.highlight, 108, 686);
  }

  // stat boxes
  const stats = d.stats.slice(0, 3);
  const gap = 24;
  const boxW = (size - 160 - gap * (stats.length - 1)) / Math.max(1, stats.length);
  stats.forEach((s, i) => {
    const x = 80 + i * (boxW + gap);
    roundRect(ctx, x, 790, boxW, 150, 24);
    ctx.fillStyle = '#20242d';
    ctx.fill();
    ctx.fillStyle = '#e8eaf0';
    ctx.font = font(800, 56);
    fitText(ctx, s.value, x + 28, 815, boxW - 56);
    ctx.fillStyle = '#9aa3b2';
    ctx.font = font(500, 30);
    fitText(ctx, s.label, x + 28, 888, boxW - 56);
  });

  // footer
  ctx.fillStyle = '#9aa3b2';
  ctx.font = font(500, 30);
  ctx.fillText(`Form checked by AI · ${APP_URL}`, 80, 990);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/png'),
  );
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > maxWidth) t = t.slice(0, -2) + '…';
  ctx.fillText(t, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Phone: opens the share menu (WhatsApp, Instagram, X...). Laptop: downloads the image. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

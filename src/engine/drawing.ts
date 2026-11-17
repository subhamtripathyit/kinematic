import type { PoseFrame } from './types';
import { POSE_CONNECTIONS } from './landmarks';

/** Draws the skeleton on the canvas that sits on top of the video. */
export function drawSkeleton(ctx: CanvasRenderingContext2D, frame: PoseFrame | null, inFrame: boolean): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!frame) return;

  const lms = frame.landmarks;
  const ok = (i: number) => (lms[i]?.visibility ?? 0) >= 0.5;

  ctx.lineWidth = Math.max(3, width / 300);
  ctx.lineCap = 'round';
  ctx.strokeStyle = inFrame ? 'rgba(56, 189, 248, 0.9)' : 'rgba(251, 191, 36, 0.9)';
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!ok(a) || !ok(b)) continue;
    ctx.beginPath();
    ctx.moveTo(lms[a].x * width, lms[a].y * height);
    ctx.lineTo(lms[b].x * width, lms[b].y * height);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  const r = Math.max(4, width / 250);
  for (let i = 11; i < lms.length; i++) {
    if (!ok(i)) continue;
    ctx.beginPath();
    ctx.arc(lms[i].x * width, lms[i].y * height, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

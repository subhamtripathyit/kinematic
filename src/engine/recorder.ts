import { POSE_CONNECTIONS } from './landmarks';
import type { PoseFrame } from './types';

/**
 * "Record session": draws the camera picture plus the skeleton, rep count, angle and
 * form tips into one canvas, and records that canvas as a video. Nothing is uploaded:
 * the finished video is only offered as a download.
 * One recorder is shared by the whole app so a routine's exercises end up in one video.
 */

export interface Hud {
  title: string;
  /** big line, e.g. "8 reps" or "Rest 0:45" */
  main: string;
  /** small line, e.g. "Set 2 of 3 · Left 4 · Right 4" */
  sub?: string;
  /** the tracked angle, in degrees */
  angle?: number | null;
  tip?: { message: string; level: 'good' | 'warn' | 'info' } | null;
}

export interface Recording {
  /** true if the microphone was recorded too */
  hasSound: boolean;
  /** sound was asked for but the microphone wasn't allowed or available */
  soundBlocked: boolean;
  url: string;
  blob: Blob;
  fileName: string;
  sizeBytes: number;
  durationMs: number;
}

/** Longest side of the recorded video. Keeps files small enough for long workouts. */
const MAX_SIDE = 960;
const BITRATE = 1_500_000;
/** Stop recording after this, so a forgotten tab can't fill the phone's memory. */
const MAX_DURATION_MS = 90 * 60 * 1000;

const VIDEO_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const SOUND_TYPES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

function pickType(withSound = false): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return (withSound ? SOUND_TYPES : VIDEO_TYPES).find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/**
 * The microphone, tuned to keep the coach's voice: echo cancellation would
 * remove the speaker sound, which is exactly what we want to hear.
 */
async function openMic(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
  } catch {
    return null;
  }
}

/** Can this browser record the session? */
export function recordingSupported(): boolean {
  return typeof document !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && pickType() !== null;
}

class SessionRecorder {
  private canvas: HTMLCanvasElement | null = null;
  private media: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private type = '';
  private startedAt = 0;
  private pausedAt = 0;
  private pausedMs = 0;
  private last: Recording | null = null;
  private mic: MediaStream | null = null;
  private soundBlocked = false;
  private starting: Promise<void> | null = null;

  /** true from start() until stop() or discard() */
  get active(): boolean {
    return this.media !== null;
  }

  /**
   * Start a new recording, or carry on with the paused one (next exercise of a routine).
   * withSound: also record the microphone (asks for permission the first time).
   */
  async begin(withSound = false): Promise<void> {
    if (this.starting) return this.starting;
    if (this.media) {
      this.resume();
      return;
    }
    this.starting = this.start(withSound).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async start(withSound: boolean): Promise<void> {
    this.clearLast();
    this.soundBlocked = false;
    this.mic = withSound ? await openMic() : null;
    if (withSound && !this.mic) this.soundBlocked = true;
    const type = pickType(this.mic !== null);
    if (!type) {
      this.stopMic();
      return;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    const stream = this.canvas.captureStream(30);
    this.mic?.getAudioTracks().forEach((track) => stream.addTrack(track));
    this.type = type;
    this.chunks = [];
    this.media = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: BITRATE });
    this.media.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.media.start(1000);
    this.startedAt = performance.now();
    this.pausedMs = 0;
    this.pausedAt = 0;
  }

  pause(): void {
    if (this.media?.state === 'recording') {
      this.media.pause();
      this.pausedAt = performance.now();
    }
  }

  private resume(): void {
    if (this.media?.state === 'paused') {
      this.media.resume();
      this.pausedMs += performance.now() - this.pausedAt;
    }
  }

  /** Draw one video frame with everything on top. Call once per camera frame while recording. */
  drawFrame(video: HTMLVideoElement, frame: PoseFrame | null, hud: Hud, mirrored: boolean): void {
    const canvas = this.canvas;
    if (!canvas || this.media?.state !== 'recording' || !video.videoWidth) return;
    if (performance.now() - this.startedAt - this.pausedMs > MAX_DURATION_MS) {
      this.pause();
      return;
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // picture + skeleton, mirrored like on screen for the front camera
    ctx.save();
    if (mirrored) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    if (frame) drawBones(ctx, frame, w, h);
    ctx.restore();

    drawHud(ctx, hud, w, h);
  }

  private stopping: Promise<Recording | null> | null = null;

  /** Finish and return the video (null if nothing was recorded). Safe to call more than once. */
  stop(): Promise<Recording | null> {
    if (this.stopping) return this.stopping;
    if (!this.media) return Promise.resolve(this.last);
    this.stopping = this.finish().finally(() => {
      this.stopping = null;
    });
    return this.stopping;
  }

  private async finish(): Promise<Recording | null> {
    const media = this.media;
    if (!media) return this.last;
    if (media.state === 'paused') this.pausedMs += performance.now() - this.pausedAt;
    const durationMs = performance.now() - this.startedAt - this.pausedMs;
    await new Promise<void>((resolve) => {
      media.onstop = () => resolve();
      if (media.state === 'inactive') resolve();
      else media.stop();
    });
    this.media = null;
    this.canvas = null;
    const hasSound = this.mic !== null;
    this.stopMic();
    const blob = new Blob(this.chunks, { type: this.type.split(';')[0] });
    this.chunks = [];
    if (blob.size === 0) return null;
    const ext = this.type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    this.last = { hasSound, soundBlocked: this.soundBlocked, url: URL.createObjectURL(blob), blob, fileName: `kinematic-${stamp}.${ext}`, sizeBytes: blob.size, durationMs };
    return this.last;
  }

  /** Throw the recording away (the workout was cancelled). */
  discard(): void {
    if (this.media && this.media.state !== 'inactive') {
      this.media.ondataavailable = null;
      this.media.stop();
    }
    this.media = null;
    this.canvas = null;
    this.chunks = [];
    this.stopMic();
  }

  /** Turn the microphone off (its light on the device goes out). */
  private stopMic(): void {
    this.mic?.getTracks().forEach((track) => track.stop());
    this.mic = null;
  }

  private clearLast(): void {
    if (this.last) URL.revokeObjectURL(this.last.url);
    this.last = null;
  }
}

export const sessionRecorder = new SessionRecorder();

function drawBones(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number): void {
  const lms = frame.landmarks;
  const ok = (i: number) => (lms[i]?.visibility ?? 0) >= 0.5;
  ctx.lineWidth = Math.max(3, w / 250);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!ok(a) || !ok(b)) continue;
    ctx.beginPath();
    ctx.moveTo(lms[a].x * w, lms[a].y * h);
    ctx.lineTo(lms[b].x * w, lms[b].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  const r = Math.max(3, w / 220);
  for (let i = 11; i < lms.length; i++) {
    if (!ok(i)) continue;
    ctx.beginPath();
    ctx.arc(lms[i].x * w, lms[i].y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

const TIP_COLORS = { good: '#4ade80', warn: '#fbbf24', info: '#93c5fd' } as const;

function drawHud(ctx: CanvasRenderingContext2D, hud: Hud, w: number, h: number): void {
  const pad = Math.round(w * 0.025);
  const big = Math.round(Math.max(22, w * 0.06));
  const small = Math.round(Math.max(13, w * 0.028));
  ctx.textBaseline = 'top';

  // top-left panel: exercise, count, set
  const lines: { text: string; size: number; bold: boolean }[] = [
    { text: hud.title, size: small, bold: false },
    { text: hud.main, size: big, bold: true },
  ];
  if (hud.sub) lines.push({ text: hud.sub, size: small, bold: false });
  if (hud.angle != null) lines.push({ text: `${Math.round(hud.angle)}°`, size: small, bold: true });
  let boxW = 0;
  let boxH = pad;
  for (const l of lines) {
    ctx.font = `${l.bold ? '700' : '500'} ${l.size}px system-ui, sans-serif`;
    boxW = Math.max(boxW, ctx.measureText(l.text).width);
    boxH += l.size * 1.25;
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(pad, pad, boxW + pad * 2, boxH);
  let y = pad * 1.5;
  for (const l of lines) {
    ctx.font = `${l.bold ? '700' : '500'} ${l.size}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(l.text, pad * 2, y);
    y += l.size * 1.25;
  }

  // bottom: the current tip or warning
  if (hud.tip) {
    ctx.font = `700 ${small + 2}px system-ui, sans-serif`;
    const tw = ctx.measureText(hud.tip.message).width;
    const bh = (small + 2) * 1.8;
    const bx = (w - tw) / 2 - pad;
    const by = h - bh - pad;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(bx, by, tw + pad * 2, bh);
    ctx.fillStyle = TIP_COLORS[hud.tip.level];
    ctx.fillText(hud.tip.message, bx + pad, by + (bh - (small + 2)) / 2);
  }

  // small watermark
  ctx.font = `600 ${Math.round(small * 0.85)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  const mark = 'Kinematic';
  ctx.fillText(mark, w - ctx.measureText(mark).width - pad, pad);
}

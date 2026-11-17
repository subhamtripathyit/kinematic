import type { Landmark } from './types';
import { LEFT_SIDE, RIGHT_SIDE, type Side } from './landmarks';

/** Angle at point b (in degrees) formed by a-b-c. aspect = video width / height. */
export function angleAt(a: Landmark, b: Landmark, c: Landmark, aspect = 1): number {
  const abx = (a.x - b.x) * aspect;
  const aby = a.y - b.y;
  const cbx = (c.x - b.x) * aspect;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle of the line from -> to, measured from horizontal (0 = flat, 90 = vertical). */
export function elevationDeg(from: Landmark, to: Landmark, aspect = 1): number {
  const dx = Math.abs((to.x - from.x) * aspect);
  const dy = Math.abs(to.y - from.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** How far the line lower -> upper leans away from vertical (0 = upright). */
export function leanFromVerticalDeg(lower: Landmark, upper: Landmark, aspect = 1): number {
  return 90 - elevationDeg(lower, upper, aspect);
}

/** True if all given points are confidently detected and inside the frame. */
export function isVisible(lms: Landmark[], ids: number[], minVisibility = 0.5): boolean {
  return ids.every((i) => {
    const l = lms[i];
    return (
      !!l &&
      (l.visibility ?? 0) >= minVisibility &&
      l.x > -0.05 && l.x < 1.05 &&
      l.y > -0.05 && l.y < 1.05
    );
  });
}

/** For side-view exercises: use whichever side of the body the camera sees better. */
export function pickSide(lms: Landmark[]): Side {
  const score = (ids: number[]) => ids.reduce((sum, i) => sum + (lms[i]?.visibility ?? 0), 0);
  return score(LEFT_SIDE) >= score(RIGHT_SIDE) ? 'left' : 'right';
}

/** Exponential moving average: removes jitter from angles. */
export class Smoother {
  private value: number | null = null;

  constructor(private readonly alpha = 0.5) {}

  next(v: number): number {
    this.value = this.value === null ? v : this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

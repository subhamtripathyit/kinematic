import { isVisible } from '../geometry';
import { sideJoints, type Joints } from '../landmarks';
import type { Landmark } from '../types';

const BOTH_SIDES = [sideJoints('left'), sideJoints('right')];

function overSides(
  lms: Landmark[],
  needed: (keyof Joints)[],
  fn: (j: Joints) => number,
  fallback: Joints,
  pick: (values: number[]) => number,
  minVisibility?: number,
): number {
  const values = BOTH_SIDES.filter((j) => isVisible(lms, needed.map((k) => j[k]), minVisibility)).map(fn);
  return values.length ? pick(values) : fn(fallback);
}

/**
 * Measures both body sides (where visible) and returns the smallest value.
 * Used for alternating exercises (lunges, curls, mountain climbers): whichever
 * side is working has the smaller angle. Also used where BOTH arms must reach
 * full range (shoulder press, jumping jacks): the weaker arm decides.
 */
export function minOverSides(
  lms: Landmark[],
  needed: (keyof Joints)[],
  fn: (j: Joints) => number,
  fallback: Joints,
  minVisibility?: number,
): number {
  return overSides(lms, needed, fn, fallback, (v) => Math.min(...v), minVisibility);
}

export function maxOverSides(lms: Landmark[], needed: (keyof Joints)[], fn: (j: Joints) => number, fallback: Joints): number {
  return overSides(lms, needed, fn, fallback, (v) => Math.max(...v));
}

/**
 * How far the hip is below (+) or above (-) the straight line from shoulder to ankle,
 * as a fraction of body length. Used for planks: + means hips sagging, - means hips piked up.
 */
export function hipOffsetFromLine(lms: Landmark[], j: Joints, aspect: number): number {
  const s = lms[j.shoulder];
  const h = lms[j.hip];
  const a = lms[j.ankle];
  const sx = s.x * aspect;
  const hx = h.x * aspect;
  const ax = a.x * aspect;
  const length = Math.hypot(ax - sx, a.y - s.y);
  if (length === 0 || Math.abs(ax - sx) < 1e-6) return 0;
  const t = (hx - sx) / (ax - sx);
  const lineY = s.y + t * (a.y - s.y);
  return (h.y - lineY) / length;
}

/** How far apart the two sides are (e.g. left vs right elbow angle). 0 if either side isn't visible. */
export function sideDifference(lms: Landmark[], needed: (keyof Joints)[], fn: (j: Joints) => number): number {
  const [l, r] = BOTH_SIDES;
  if (!isVisible(lms, needed.map((k) => l[k])) || !isVisible(lms, needed.map((k) => r[k]))) return 0;
  return Math.abs(fn(l) - fn(r));
}

/** Heel and toe points (MediaPipe 29–32) for the side these joints belong to. */
const FOOT = { left: { heel: 29, toe: 31 }, right: { heel: 30, toe: 32 } } as const;

/** True if the heel is clearly off the floor (higher than the toes), for side-view exercises. */
export function heelLifted(lms: Landmark[], j: Joints, aspect: number): boolean {
  const foot = j.hip === 23 ? FOOT.left : FOOT.right;
  if (!isVisible(lms, [foot.heel, foot.toe, j.knee, j.ankle])) return false;
  const shin = Math.hypot((lms[j.knee].x - lms[j.ankle].x) * aspect, lms[j.knee].y - lms[j.ankle].y);
  if (shin === 0) return false;
  return (lms[foot.toe].y - lms[foot.heel].y) / shin > 0.15;
}

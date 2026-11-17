import type { Feedback, Landmark } from './types';
import { isVisible } from './geometry';

/** Body-part names for the landmarks we check, and whether to say "is" or "are". */
const PART: Record<number, { name: string; plural: boolean }> = {
  0: { name: 'head', plural: false },
  11: { name: 'shoulders', plural: true },
  12: { name: 'shoulders', plural: true },
  13: { name: 'elbows', plural: true },
  14: { name: 'elbows', plural: true },
  15: { name: 'hands', plural: true },
  16: { name: 'hands', plural: true },
  23: { name: 'hips', plural: true },
  24: { name: 'hips', plural: true },
  25: { name: 'knees', plural: true },
  26: { name: 'knees', plural: true },
  27: { name: 'feet', plural: true },
  28: { name: 'feet', plural: true },
};

const info = (id: string, message: string): Feedback => ({ id, message, level: 'info' });

/**
 * Says exactly what's wrong with the framing, e.g.
 * "Your feet are out of frame. Step back or tilt the camera down."
 * lms = null means no person was found at all.
 */
export function outOfFrameFeedback(lms: Landmark[] | null, required: number[]): Feedback {
  if (!lms) return info('oof-nobody', 'Step into the frame so the camera can see you');

  const missing = required.filter((i) => !isVisible(lms, [i]));
  if (missing.length === 0) return info('oof-generic', 'Step back so your whole body is visible');

  // Lowest body part first: feet are the most common thing to lose on a phone.
  const sorted = [...missing].sort((a, b) => (lms[b]?.y ?? 0) - (lms[a]?.y ?? 0));
  const below = sorted.find((i) => (lms[i]?.y ?? 0) >= 0.98);
  const above = sorted.find((i) => (lms[i]?.y ?? 1) <= 0.02);
  const sideways = sorted.find((i) => (lms[i]?.x ?? 0.5) <= 0.02 || (lms[i]?.x ?? 0.5) >= 0.98);

  const say = (i: number) => {
    const p = PART[i] ?? { name: 'body', plural: false };
    return { name: p.name, verb: p.plural ? 'are' : 'is' };
  };

  if (below !== undefined) {
    const p = say(below);
    return info(`oof-below-${p.name}`, `Your ${p.name} ${p.verb} out of frame. Step back or tilt the camera down`);
  }
  if (above !== undefined) {
    const p = say(above);
    return info(`oof-above-${p.name}`, `Your ${p.name} ${p.verb} cut off. Step back or tilt the camera up`);
  }
  if (sideways !== undefined) {
    return info('oof-side', 'Move to the middle of the frame');
  }
  // Inside the frame but not clearly seen: usually hidden behind the body or bad light.
  const p = say(sorted[0]);
  return info(`oof-hidden-${p.name}`, `Make sure your ${p.name} ${p.verb} clearly visible`);
}

/**
 * For side-view exercises: if the shoulders look wide compared with the torso,
 * the person is facing the camera instead of standing side-on.
 */
export function facingCameraFeedback(lms: Landmark[], aspect: number): Feedback | null {
  if (!isVisible(lms, [11, 12, 23, 24], 0.6)) return null;
  const ls = lms[11];
  const rs = lms[12];
  const lh = lms[23];
  const rh = lms[24];
  const shoulderWidth = Math.abs(ls.x - rs.x) * aspect;
  const torso = Math.hypot(((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2) * aspect, (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2);
  if (torso === 0) return null;
  return shoulderWidth / torso > 0.55 ? info('turn-side', 'Turn side-on to the camera') : null;
}

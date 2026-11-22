import { angleAt, isVisible, leanFromVerticalDeg } from '../geometry';
import type { Side } from '../landmarks';
import type { Landmark } from '../types';
import type { RepDefinition } from './createAnalyzer';
import { minOverSides, onFeet, torsoElevation } from './helpers';

/** Alternating lunges: each lunge (either leg) counts as 1 rep. */
export const lunge: RepDefinition = {
  id: 'lunge',
  name: 'Lunge',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Stand side-on to the camera, 2–3 m away, with your whole body in view. Alternate legs.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Front knee angle (the more-bent knee): ~175° standing, ~90° at the bottom.
  // The far leg is partly hidden in a side view, so it's accepted at lower visibility:
  // otherwise lunges on the far leg would only see the back knee and count as partial.
  measure: (lms, j, aspect) =>
    minOverSides(
      lms,
      ['hip', 'knee', 'ankle'],
      (s) => angleAt(lms[s.hip], lms[s.knee], lms[s.ankle], aspect),
      j,
      FAR_LEG_VISIBILITY,
    ),
  counter: { direction: 'decrease', restThreshold: 160, startThreshold: 140, activeThreshold: 100, limit: 80 },
  position: {
    message: 'Stand up straight to start',
    isIn: (lms, j, aspect) => onFeet(lms, j, aspect) && torsoElevation(lms, j, aspect) > 40,
  },
  partialMessage: 'Go deeper',
  // count each side separately ("Left 5 · Right 5")
  sides: { vote: (lms, aspect) => frontLeg(lms, aspect) },
  checks: [
    {
      id: 'lunge-upright',
      message: 'Keep your torso upright',
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 30,
    },
    {
      id: 'lunge-upright-strict',
      message: 'Keep your torso upright',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 20,
    },
  ],
};

/** Far-side leg landmarks are often 0.3–0.5 visible in a side view; still usable. */
const FAR_LEG_VISIBILITY = 0.3;

const LEGS = {
  left: { hip: 23, knee: 25, ankle: 27 },
  right: { hip: 24, knee: 26, ankle: 28 },
} as const;

/** The back knee must sit this much lower than the front knee (fraction of leg length)... */
const KNEE_DROP = 0.12;
/** ...or the back shin must lean this much more than the front shin (degrees). */
const SHIN_TILT = 20;

/**
 * Which leg is in front at this moment, or null if unclear.
 * Both knees bend in a lunge, so knee angles can't tell the legs apart. Instead:
 * the back knee drops toward the floor (lower in the image) and the back shin
 * tilts, while the front shin stays close to vertical.
 * In a side view the far leg is partly hidden, so a lower visibility bar is used;
 * the per-rep majority vote absorbs the odd frame where the legs get swapped.
 */
export function frontLeg(lms: Landmark[], aspect: number): Side | null {
  const ids = [...Object.values(LEGS.left), ...Object.values(LEGS.right)];
  if (!isVisible(lms, ids, FAR_LEG_VISIBILITY)) return null;
  const dist = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const legLength = (s: Side) => {
    const l = LEGS[s];
    return dist(lms[l.hip], lms[l.knee]) + dist(lms[l.knee], lms[l.ankle]);
  };
  const len = (legLength('left') + legLength('right')) / 2;
  if (len === 0) return null;

  // + means the left knee is lower / the left shin leans more, i.e. left looks like the BACK leg
  const kneeDrop = (lms[LEGS.left.knee].y - lms[LEGS.right.knee].y) / len;
  const shinLean = (s: Side) => leanFromVerticalDeg(lms[LEGS[s].ankle], lms[LEGS[s].knee], aspect);
  const shinDiff = shinLean('left') - shinLean('right');

  const kneeSays = Math.abs(kneeDrop) >= KNEE_DROP ? Math.sign(kneeDrop) : 0;
  const shinSays = Math.abs(shinDiff) >= SHIN_TILT ? Math.sign(shinDiff) : 0;
  if (kneeSays !== 0 && shinSays !== 0 && kneeSays !== shinSays) return null; // signals disagree
  const backIsLeft = kneeSays || shinSays;
  if (backIsLeft === 0) return null;
  return backIsLeft > 0 ? 'right' : 'left';
}

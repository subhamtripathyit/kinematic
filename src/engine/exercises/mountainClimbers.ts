import { angleAt } from '../geometry';
import type { RepDefinition } from './createAnalyzer';
import { maxOverSides, minOverTrustedSides, torsoElevation } from './helpers';

/** Each knee drive (either leg) counts as 1 rep. */
export const mountainClimbers: RepDefinition = {
  id: 'mountain-climbers',
  name: 'Mountain climbers',
  category: 'cardio',
  cameraView: 'side',
  setupHint: 'Get into a high plank side-on to the camera (on the floor, ~2 m away), whole body in view.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Hip angle of the driving leg: ~165° leg back, ~90° knee at chest.
  measure: (lms, j, aspect) =>
    // far arm/leg only when clearly visible (side view: it is often hidden and guessed)
    minOverTrustedSides(lms, ['shoulder', 'hip', 'knee'], (s) => angleAt(lms[s.shoulder], lms[s.hip], lms[s.knee], aspect), j),
  counter: { direction: 'decrease', restThreshold: 145, startThreshold: 130, activeThreshold: 100, limit: 80 },
  position: {
    message: 'Get into plank position',
    isIn: (lms, j, aspect) => torsoElevation(lms, j, aspect) < 50,
  },
  partialMessage: 'Drive your knee further in',
  // Done fast on purpose: no 'Slow down'.
  minRepMs: 0,
  // count each side separately ("Left 5 · Right 5")
  sides: {
    needs: ['shoulder', 'hip', 'knee'],
    measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.hip], lms[j.knee], aspect),
  },
  checks: [
    {
      id: 'climbers-hips',
      message: 'Keep your hips down',
      phases: ['rest', 'moving', 'active'],
      // Back leg (the straighter one) should form a line from shoulder to ankle.
      isWrong: ({ lms, joints, aspect }) =>
        maxOverSides(lms, ['shoulder', 'hip', 'ankle'], (s) => angleAt(lms[s.shoulder], lms[s.hip], lms[s.ankle], aspect), joints) < 150,
    },
    {
      id: 'climbers-hips-strict',
      message: 'Keep your hips down',
      phases: ['rest', 'moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) =>
        maxOverSides(lms, ['shoulder', 'hip', 'ankle'], (s) => angleAt(lms[s.shoulder], lms[s.hip], lms[s.ankle], aspect), joints) < 160,
    },
  ],
};

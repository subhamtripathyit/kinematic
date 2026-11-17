import { angleAt, leanFromVerticalDeg } from '../geometry';
import type { RepDefinition } from './createAnalyzer';
import { minOverSides } from './helpers';

/** Alternating lunges: each lunge (either leg) counts as 1 rep. */
export const lunge: RepDefinition = {
  id: 'lunge',
  name: 'Lunge',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Stand side-on to the laptop, 2–3 m away, with your whole body in view. Alternate legs.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Front knee angle (the more-bent knee): ~175° standing, ~90° at the bottom.
  measure: (lms, j, aspect) =>
    minOverSides(lms, ['hip', 'knee', 'ankle'], (s) => angleAt(lms[s.hip], lms[s.knee], lms[s.ankle], aspect), j),
  counter: { direction: 'decrease', restThreshold: 160, startThreshold: 140, activeThreshold: 100 },
  partialMessage: 'Go deeper',
  checks: [
    {
      id: 'lunge-upright',
      message: 'Keep your torso upright',
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 30,
    },
  ],
};

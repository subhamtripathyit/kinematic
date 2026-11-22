import { angleAt, elevationDeg, isVisible } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

export const situp: RepDefinition = {
  id: 'situp',
  name: 'Sit-up',
  category: 'core',
  cameraView: 'side',
  setupHint: 'Lie side-on to the laptop with it on the floor, about 2 m away, knees bent.',
  requiredJoints: ['shoulder', 'hip', 'knee'],
  // Torso angle off the floor: ~0–10° lying, 60°+ sitting up.
  measure: (lms, j, aspect) => elevationDeg(lms[j.hip], lms[j.shoulder], aspect),
  counter: { direction: 'increase', restThreshold: 15, startThreshold: 25, activeThreshold: 60, limit: 75 },
  partialMessage: 'Come all the way up',
  checks: [
    {
      id: 'situp-legs',
      message: 'Keep your knees bent',
      phases: ['moving', 'active'],
      minLevel: 3,
      isWrong: ({ lms, joints, aspect }) =>
        isVisible(lms, [joints.ankle]) && angleAt(lms[joints.hip], lms[joints.knee], lms[joints.ankle], aspect) > 130,
    },
  ],
};

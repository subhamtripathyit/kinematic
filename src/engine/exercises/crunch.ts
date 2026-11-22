import { elevationDeg } from '../geometry';
import { kneesUp } from './helpers';
import type { RepDefinition } from './createAnalyzer';

export const crunch: RepDefinition = {
  id: 'crunch',
  name: 'Crunch',
  category: 'core',
  cameraView: 'side',
  setupHint: 'Lie side-on to the camera with it on the floor, about 2 m away, knees bent.',
  requiredJoints: ['shoulder', 'hip', 'knee'],
  // How far the torso lifts off the floor: ~0–10° lying flat, 30°+ at the top of a crunch.
  measure: (lms, j, aspect) => elevationDeg(lms[j.hip], lms[j.shoulder], aspect),
  counter: { direction: 'increase', restThreshold: 12, startThreshold: 18, activeThreshold: 30, limit: 40 },
  position: {
    message: 'Lie on your back, knees bent, to start',
    isIn: (lms, j) => kneesUp(lms, j),
  },
  partialMessage: 'Crunch a bit higher',
  checks: [
    {
      id: 'crunch-too-high',
      message: "Don't sit all the way up",
      phases: ['active'],
      minLevel: 3,
      isWrong: ({ value }) => value > 60,
    },
  ],
};

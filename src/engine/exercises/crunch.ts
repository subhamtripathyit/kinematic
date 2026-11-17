import { elevationDeg } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

export const crunch: RepDefinition = {
  id: 'crunch',
  name: 'Crunch',
  category: 'core',
  cameraView: 'side',
  setupHint: 'Lie side-on to the laptop with it on the floor, about 2 m away, knees bent.',
  requiredJoints: ['shoulder', 'hip', 'knee'],
  // How far the torso lifts off the floor: ~0–10° lying flat, 30°+ at the top of a crunch.
  measure: (lms, j, aspect) => elevationDeg(lms[j.hip], lms[j.shoulder], aspect),
  counter: { direction: 'increase', restThreshold: 12, startThreshold: 18, activeThreshold: 30 },
  partialMessage: 'Crunch a bit higher',
  checks: [],
};

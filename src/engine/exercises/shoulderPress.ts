import { angleAt } from '../geometry';
import type { RepDefinition } from './createAnalyzer';
import { minOverSides } from './helpers';

export const shoulderPress: RepDefinition = {
  id: 'shoulder-press',
  name: 'Shoulder press',
  category: 'shoulders',
  cameraView: 'front',
  setupHint: 'Face the laptop, 2–3 m away, with your head, arms and hips in view. Start with hands at shoulder height.',
  requiredJoints: ['shoulder', 'elbow', 'wrist'],
  // Elbow angle of the weaker arm: ~80–90° at the bottom, ~170° locked out.
  measure: (lms, j, aspect) =>
    minOverSides(lms, ['shoulder', 'elbow', 'wrist'], (s) => angleAt(lms[s.shoulder], lms[s.elbow], lms[s.wrist], aspect), j),
  counter: { direction: 'increase', restThreshold: 100, startThreshold: 120, activeThreshold: 160 },
  partialMessage: 'Press all the way up',
  checks: [],
};

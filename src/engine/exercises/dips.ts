import { angleAt } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

export const dips: RepDefinition = {
  id: 'dips',
  name: 'Dips',
  category: 'chest',
  cameraView: 'side',
  setupHint: 'Set up on parallel bars side-on to the laptop, 2–3 m away, so your upper body and arms are in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Elbow angle: ~165° at the top, ~90° at the bottom.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 95 },
  partialMessage: 'Go lower',
  checks: [],
};

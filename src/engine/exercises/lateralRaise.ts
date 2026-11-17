import { angleAt } from '../geometry';
import type { RepDefinition } from './createAnalyzer';
import { maxOverSides, minOverSides } from './helpers';

export const lateralRaise: RepDefinition = {
  id: 'lateral-raise',
  name: 'Lateral raise',
  category: 'shoulders',
  cameraView: 'front',
  setupHint: 'Face the laptop, 2–3 m away, with your arms and hips in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Arm angle from the body (hip-shoulder-wrist): ~15° arms down, ~90° at shoulder height.
  measure: (lms, j, aspect) =>
    minOverSides(lms, ['hip', 'shoulder', 'wrist'], (s) => angleAt(lms[s.hip], lms[s.shoulder], lms[s.wrist], aspect), j),
  counter: { direction: 'increase', restThreshold: 35, startThreshold: 50, activeThreshold: 80 },
  partialMessage: 'Raise to shoulder height',
  checks: [
    {
      id: 'lateral-too-high',
      message: 'Stop at shoulder height',
      phases: ['active'],
      isWrong: ({ lms, joints, aspect }) =>
        maxOverSides(lms, ['hip', 'shoulder', 'wrist'], (s) => angleAt(lms[s.hip], lms[s.shoulder], lms[s.wrist], aspect), joints) > 115,
    },
  ],
};

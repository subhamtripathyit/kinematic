import { angleAt } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

export const pushup: RepDefinition = {
  id: 'pushup',
  name: 'Push-up',
  category: 'chest',
  cameraView: 'side',
  setupHint: 'Put the laptop on the floor side-on to you, about 2 m away, so your whole body is in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],
  // Elbow angle: ~170° arms straight, ~80–90° at the bottom.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  counter: { direction: 'decrease', restThreshold: 155, startThreshold: 135, activeThreshold: 100 },
  partialMessage: 'Go lower',
  checks: [
    {
      id: 'pushup-body-line',
      message: 'Keep your body in a straight line',
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) =>
        angleAt(lms[joints.shoulder], lms[joints.hip], lms[joints.ankle], aspect) < 155,
    },
  ],
};

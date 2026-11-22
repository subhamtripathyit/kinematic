import { angleAt } from '../geometry';
import { bodyHorizontal } from './helpers';
import type { RepDefinition } from './createAnalyzer';

export const pushup: RepDefinition = {
  id: 'pushup',
  name: 'Push-up',
  category: 'chest',
  cameraView: 'side',
  setupHint: 'Put the phone or laptop on the floor side-on to you, about 2 m away, so your whole body is in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],
  // Elbow angle: ~170° arms straight, ~80–90° at the bottom.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  counter: { direction: 'decrease', restThreshold: 155, startThreshold: 135, activeThreshold: 100, limit: 75 },
  position: {
    message: 'Get into push-up position',
    isIn: (lms, j, aspect) => bodyHorizontal(lms, j, aspect),
  },
  partialMessage: 'Go lower',
  checks: [
    {
      id: 'pushup-body-line',
      message: 'Keep your body in a straight line',
      phases: ['moving', 'active'],
      minLevel: 1, // safety: on at every level
      isWrong: ({ lms, joints, aspect }) =>
        angleAt(lms[joints.shoulder], lms[joints.hip], lms[joints.ankle], aspect) < 155,
    },
    {
      id: 'pushup-body-line-strict',
      message: 'Keep your body in a straight line',
      phases: ['rest', 'moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) =>
        angleAt(lms[joints.shoulder], lms[joints.hip], lms[joints.ankle], aspect) < 165,
    },
  ],
};

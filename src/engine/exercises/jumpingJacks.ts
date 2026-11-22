import { angleAt } from '../geometry';
import { LM } from '../landmarks';
import type { RepDefinition } from './createAnalyzer';
import { minOverSides, onFeet, torsoElevation } from './helpers';

export const jumpingJacks: RepDefinition = {
  id: 'jumping-jacks',
  name: 'Jumping jacks',
  category: 'cardio',
  cameraView: 'front',
  setupHint: 'Face the camera, 2.5–3 m away, so your whole body including raised arms is in view.',
  requiredJoints: ['shoulder', 'wrist', 'hip', 'ankle'],
  // Arm angle from the body (lower arm decides): ~15° at the sides, ~160° overhead.
  measure: (lms, j, aspect) =>
    minOverSides(lms, ['hip', 'shoulder', 'wrist'], (s) => angleAt(lms[s.hip], lms[s.shoulder], lms[s.wrist], aspect), j),
  counter: { direction: 'increase', restThreshold: 40, startThreshold: 70, activeThreshold: 140, limit: 165 },
  position: {
    message: 'Stand up straight to start',
    isIn: (lms, j, aspect) => onFeet(lms, j, aspect) && torsoElevation(lms, j, aspect) > 55,
  },
  partialMessage: 'Raise your arms fully',
  // Done fast on purpose: no 'Slow down'.
  minRepMs: 0,
  checks: [
    {
      id: 'jacks-feet',
      message: 'Jump your feet wider',
      phases: ['active'],
      isWrong: ({ lms, aspect }) => {
        const hipWidth = Math.abs(lms[LM.LEFT_HIP].x - lms[LM.RIGHT_HIP].x) * aspect;
        const feetWidth = Math.abs(lms[LM.LEFT_ANKLE].x - lms[LM.RIGHT_ANKLE].x) * aspect;
        return feetWidth < hipWidth * 1.6;
      },
    },
    {
      id: 'jacks-feet-strict',
      message: 'Jump your feet wider',
      phases: ['active'],
      minLevel: 4,
      isWrong: ({ lms, aspect }) => {
        const hipWidth = Math.abs(lms[LM.LEFT_HIP].x - lms[LM.RIGHT_HIP].x) * aspect;
        const feetWidth = Math.abs(lms[LM.LEFT_ANKLE].x - lms[LM.RIGHT_ANKLE].x) * aspect;
        return feetWidth < hipWidth * 2;
      },
    },
  ],
};

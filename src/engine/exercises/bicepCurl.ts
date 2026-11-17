import { angleAt, leanFromVerticalDeg } from '../geometry';
import type { RepDefinition } from './createAnalyzer';
import { minOverSides } from './helpers';

/** Works for both-arm or alternating curls: each curl counts as 1 rep. */
export const bicepCurl: RepDefinition = {
  id: 'bicep-curl',
  name: 'Bicep curl',
  category: 'arms',
  cameraView: 'side',
  setupHint: 'Stand side-on to the laptop, 2–3 m away, with your upper body and hips in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Elbow angle of the working arm: ~165° arm down, ~45° fully curled.
  measure: (lms, j, aspect) =>
    minOverSides(lms, ['shoulder', 'elbow', 'wrist'], (s) => angleAt(lms[s.shoulder], lms[s.elbow], lms[s.wrist], aspect), j),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 60 },
  partialMessage: 'Curl all the way up',
  checks: [
    {
      id: 'curl-swing',
      message: "Don't swing your back",
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 15,
    },
  ],
};

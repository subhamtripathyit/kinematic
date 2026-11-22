import { angleAt, leanFromVerticalDeg } from '../geometry';
import type { RepDefinition } from './createAnalyzer';
import { maxOverSides, minOverSides } from './helpers';

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
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 60, limit: 45 },
  partialMessage: 'Curl all the way up',
  // count each side separately ("Left 5 · Right 5")
  sides: {
    needs: ['shoulder', 'elbow', 'wrist'],
    measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  },
  checks: [
    {
      id: 'curl-swing',
      message: "Don't swing your back",
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 15,
    },
    {
      id: 'curl-elbows',
      message: 'Keep your elbows at your sides',
      phases: ['moving', 'active'],
      minLevel: 3,
      // upper arm vs torso: ~0–20° with the elbow pinned, more when it drifts forward
      isWrong: ({ lms, joints, aspect }) =>
        maxOverSides(lms, ['hip', 'shoulder', 'elbow'], (s) => angleAt(lms[s.hip], lms[s.shoulder], lms[s.elbow], aspect), joints) > 35,
    },
    {
      id: 'curl-swing-strict',
      message: "Don't swing your back",
      phases: ['moving', 'active'],
      minLevel: 5,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 10,
    },
  ],
};

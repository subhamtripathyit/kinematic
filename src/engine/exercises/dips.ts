import { angleAt, leanFromVerticalDeg } from '../geometry';
import { torsoElevation } from './helpers';
import type { RepDefinition } from './createAnalyzer';

export const dips: RepDefinition = {
  id: 'dips',
  name: 'Dips',
  category: 'chest',
  cameraView: 'side',
  setupHint: 'Set up on parallel bars side-on to the camera, 2–3 m away, so your upper body and arms are in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Elbow angle: ~165° at the top, ~90° at the bottom.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 95, limit: 75 },
  position: {
    message: 'Get onto the bars to start',
    isIn: (lms, j, aspect) => torsoElevation(lms, j, aspect) > 40 && lms[j.wrist].y > lms[j.shoulder].y,
  },
  partialMessage: 'Go lower',
  checks: [
    {
      id: 'dips-lean',
      message: 'Keep your torso more upright',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 50,
    },
  ],
};

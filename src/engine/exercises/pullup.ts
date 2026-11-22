import { hanging, sideDifference } from './helpers';
import { angleAt } from '../geometry';
import { LM } from '../landmarks';
import type { RepDefinition } from './createAnalyzer';

export const pullup: RepDefinition = {
  id: 'pullup',
  name: 'Pull-up',
  category: 'back',
  cameraView: 'front',
  setupHint: 'Face the camera (or face away), 2–3 m back and angled up, so your hands on the bar and your hips are in view. Go all the way down each rep.',
  requiredJoints: ['shoulder', 'elbow', 'wrist'],
  // Elbow angle: ~170° hanging, ~60° at the top.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 80, limit: 55 },
  position: {
    message: 'Hang from the bar to start',
    isIn: (lms, j) => hanging(lms, j),
  },
  partialMessage: 'Pull higher',
  checks: [
    {
      id: 'pullup-chin',
      message: 'Get your chin over the bar',
      phases: ['active'],
      // y grows downward: nose below the wrists means chin is under the bar.
      isWrong: ({ lms, joints }) => lms[LM.NOSE].y > lms[joints.wrist].y,
    },
    {
      id: 'pullup-even',
      message: 'Pull evenly with both arms',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, aspect }) =>
        sideDifference(lms, ['shoulder', 'elbow', 'wrist'], (s) => angleAt(lms[s.shoulder], lms[s.elbow], lms[s.wrist], aspect)) > 30,
    },
  ],
};

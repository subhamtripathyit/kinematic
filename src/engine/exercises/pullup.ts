import { angleAt } from '../geometry';
import { LM } from '../landmarks';
import type { RepDefinition } from './createAnalyzer';

export const pullup: RepDefinition = {
  id: 'pullup',
  name: 'Pull-up',
  category: 'back',
  cameraView: 'front',
  setupHint: 'Face the laptop (or face away), 2–3 m back and angled up, so your hands on the bar and your hips are in view. Go all the way down each rep.',
  requiredJoints: ['shoulder', 'elbow', 'wrist'],
  // Elbow angle: ~170° hanging, ~60° at the top.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.elbow], lms[j.wrist], aspect),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 80 },
  partialMessage: 'Pull higher',
  checks: [
    {
      id: 'pullup-chin',
      message: 'Get your chin over the bar',
      phases: ['active'],
      // y grows downward: nose below the wrists means chin is under the bar.
      isWrong: ({ lms, joints }) => lms[LM.NOSE].y > lms[joints.wrist].y,
    },
  ],
};

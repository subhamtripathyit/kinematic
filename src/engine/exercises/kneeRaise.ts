import { angleAt, leanFromVerticalDeg } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

/** Hanging knee raise. */
export const kneeRaise: RepDefinition = {
  id: 'knee-raise',
  name: 'Hanging knee raise',
  category: 'core',
  cameraView: 'side',
  setupHint: 'Hang from the bar side-on to the laptop, 2–3 m away and angled up, so your whole body is in view.',
  requiredJoints: ['shoulder', 'hip', 'knee'],
  // Hip angle (torso vs thigh): ~175° hanging straight, ~90° with knees at hip height.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.hip], lms[j.knee], aspect),
  counter: { direction: 'decrease', restThreshold: 155, startThreshold: 135, activeThreshold: 100, limit: 75 },
  partialMessage: 'Bring your knees higher',
  checks: [
    {
      id: 'knee-raise-swing',
      message: 'Control the swing',
      phases: ['moving'],
      isWrong: ({ lms, joints, aspect }) =>
        leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 35,
    },
    {
      id: 'knee-raise-swing-strict',
      message: 'Control the swing',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 25,
    },
  ],
};

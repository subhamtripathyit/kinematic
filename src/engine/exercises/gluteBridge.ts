import { angleAt, isVisible } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

export const gluteBridge: RepDefinition = {
  id: 'glute-bridge',
  name: 'Glute bridge',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Lie on your back side-on to the laptop (on the floor, ~2 m away), knees bent, feet flat.',
  requiredJoints: ['shoulder', 'hip', 'knee'],
  // Hip angle: ~130–140° lying with knees bent, ~170° with hips fully up.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.hip], lms[j.knee], aspect),
  counter: { direction: 'increase', restThreshold: 148, startThreshold: 156, activeThreshold: 168, limit: 175 },
  partialMessage: 'Lift your hips higher',
  checks: [
    {
      id: 'bridge-feet',
      message: 'Bring your feet closer to your hips',
      phases: ['active'],
      minLevel: 3,
      isWrong: ({ lms, joints, aspect }) =>
        isVisible(lms, [joints.ankle]) && angleAt(lms[joints.hip], lms[joints.knee], lms[joints.ankle], aspect) > 120,
    },
  ],
};

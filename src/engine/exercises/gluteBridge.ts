import { angleAt, isVisible } from '../geometry';
import { hipOffsetFromLine, kneesUp, torsoElevation } from './helpers';
import type { RepDefinition } from './createAnalyzer';

export const gluteBridge: RepDefinition = {
  id: 'glute-bridge',
  name: 'Glute bridge',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Lie on your back side-on to the laptop (on the floor, ~2 m away), knees bent, feet flat.',
  requiredJoints: ['shoulder', 'hip', 'knee'],
  // Hip angle: ~130–140° lying with knees bent, ~170° with hips fully up.
  // Past the straight line (hips pushed higher than shoulder-to-knee) it keeps going up instead of
  // turning back down, so over-arching at the top can't count as a second rep.
  measure: (lms, j, aspect) => {
    const angle = angleAt(lms[j.shoulder], lms[j.hip], lms[j.knee], aspect);
    const hipAboveLine = hipOffsetFromLine(lms, { ...j, ankle: j.knee }, aspect) < 0;
    return hipAboveLine ? 360 - angle : angle;
  },
  counter: { direction: 'increase', restThreshold: 148, startThreshold: 156, activeThreshold: 168, limit: 175 },
  position: {
    message: 'Lie on your back, knees bent, to start',
    isIn: (lms, j, aspect) => kneesUp(lms, j) && torsoElevation(lms, j, aspect) < 50,
  },
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

import { angleAt, leanFromVerticalDeg } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

export const squat: RepDefinition = {
  id: 'squat',
  name: 'Squat',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Stand side-on to the laptop, 2–3 m away, with your whole body in view.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Knee angle: ~175° standing, ~90° at parallel.
  measure: (lms, j, aspect) => angleAt(lms[j.hip], lms[j.knee], lms[j.ankle], aspect),
  counter: { direction: 'decrease', restThreshold: 160, startThreshold: 140, activeThreshold: 100 },
  partialMessage: 'Go deeper',
  checks: [
    {
      id: 'squat-lean',
      message: 'Keep your chest up',
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) =>
        leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 50,
    },
  ],
};

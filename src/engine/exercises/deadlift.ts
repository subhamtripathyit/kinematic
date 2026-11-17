import { angleAt } from '../geometry';
import type { RepDefinition } from './createAnalyzer';

/** Romanian deadlift: hinge at the hips with soft knees. */
export const deadlift: RepDefinition = {
  id: 'deadlift',
  name: 'Romanian deadlift',
  category: 'back',
  cameraView: 'side',
  setupHint: 'Stand side-on to the laptop, 2–3 m away, with your whole body in view.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Hip angle: ~175° standing, ~100° at the bottom of the hinge.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.hip], lms[j.knee], aspect),
  counter: { direction: 'decrease', restThreshold: 160, startThreshold: 140, activeThreshold: 110 },
  partialMessage: 'Hinge further: push your hips back',
  checks: [
    {
      id: 'rdl-knees',
      message: "Hinge at the hips, don't squat it",
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => angleAt(lms[joints.hip], lms[joints.knee], lms[joints.ankle], aspect) < 130,
    },
  ],
};

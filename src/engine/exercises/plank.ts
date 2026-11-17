import { angleAt, elevationDeg } from '../geometry';
import type { HoldDefinition } from './createAnalyzer';
import { hipOffsetFromLine } from './helpers';

export const plank: HoldDefinition = {
  kind: 'hold',
  id: 'plank',
  name: 'Plank',
  category: 'core',
  cameraView: 'side',
  setupHint: 'Get into a forearm or high plank side-on to the laptop (on the floor, ~2 m away), whole body in view.',
  requiredJoints: ['shoulder', 'hip', 'ankle'],
  // Body line (shoulder-hip-ankle): 180° = perfectly straight.
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.hip], lms[j.ankle], aspect),
  positionRule: 'In position when the body line is above 145° and the body is within 40° of flat. Timer runs only while the line is above 165°.',
  positionMessage: 'Get into plank position',
  inPosition: ({ lms, joints, aspect, value }) =>
    value > 145 && elevationDeg(lms[joints.ankle], lms[joints.shoulder], aspect) < 40,
  checks: [
    {
      id: 'plank-sag',
      message: 'Lift your hips',
      isWrong: ({ lms, joints, aspect, value }) => value < 165 && hipOffsetFromLine(lms, joints, aspect) > 0,
    },
    {
      id: 'plank-pike',
      message: 'Lower your hips',
      isWrong: ({ lms, joints, aspect, value }) => value < 165 && hipOffsetFromLine(lms, joints, aspect) <= 0,
    },
  ],
};

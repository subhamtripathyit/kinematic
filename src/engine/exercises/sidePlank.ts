import { angleAt, elevationDeg } from '../geometry';
import type { HoldDefinition } from './createAnalyzer';
import { hipOffsetFromLine } from './helpers';

export const sidePlank: HoldDefinition = {
  kind: 'hold',
  id: 'side-plank',
  name: 'Side plank',
  category: 'core',
  cameraView: 'front',
  setupHint: 'Face the laptop in a side plank (on the floor, ~2 m away), so your whole body is in view.',
  requiredJoints: ['shoulder', 'hip', 'ankle'],
  measure: (lms, j, aspect) => angleAt(lms[j.shoulder], lms[j.hip], lms[j.ankle], aspect),
  positionRule: 'In position when the body line is above 140° and you are not standing upright. Timer runs only while the line is above 160°.',
  positionMessage: 'Get into side plank position',
  inPosition: ({ lms, joints, aspect, value }) =>
    value > 140 && elevationDeg(lms[joints.ankle], lms[joints.shoulder], aspect) < 60,
  checks: [
    {
      id: 'side-plank-sag',
      message: 'Lift your hips',
      isWrong: ({ lms, joints, aspect, value }) => value < 160 && hipOffsetFromLine(lms, joints, aspect) > 0,
    },
    {
      id: 'side-plank-line',
      message: 'Straighten your body',
      isWrong: ({ lms, joints, aspect, value }) => value < 160 && hipOffsetFromLine(lms, joints, aspect) <= 0,
    },
  ],
};

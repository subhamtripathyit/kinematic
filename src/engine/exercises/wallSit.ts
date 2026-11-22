import { angleAt, leanFromVerticalDeg } from '../geometry';
import type { HoldDefinition } from './createAnalyzer';

export const wallSit: HoldDefinition = {
  kind: 'hold',
  id: 'wall-sit',
  name: 'Wall sit',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Sit against a wall side-on to the camera, 2–3 m away, with your whole body in view.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Knee angle: 90° = thighs parallel to the floor.
  measure: (lms, j, aspect) => angleAt(lms[j.hip], lms[j.knee], lms[j.ankle], aspect),
  positionRule: 'In position when the knee angle is 60–130° with your back upright. Timer runs only between 75° and 105°.',
  positionMessage: 'Sit back against the wall',
  inPosition: ({ lms, joints, aspect, value }) =>
    value > 60 && value < 130 && leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) < 35,
  checks: [
    { id: 'wall-sit-high', message: 'Slide lower: thighs parallel to the floor', isWrong: ({ value }) => value > 105 },
    { id: 'wall-sit-low', message: 'Come up a bit: knees at 90°', isWrong: ({ value }) => value < 75 },
    { id: 'wall-sit-high-strict', message: 'Slide lower: thighs parallel to the floor', minLevel: 4, isWrong: ({ value }) => value > 100 },
    { id: 'wall-sit-low-strict', message: 'Come up a bit: knees at 90°', minLevel: 4, isWrong: ({ value }) => value < 80 },
  ],
};

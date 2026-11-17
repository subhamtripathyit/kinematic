/** MediaPipe Pose landmark indices we use. Full list: 33 points. */
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export type Side = 'left' | 'right';

export interface Joints {
  shoulder: number;
  elbow: number;
  wrist: number;
  hip: number;
  knee: number;
  ankle: number;
}

export function sideJoints(side: Side): Joints {
  return side === 'left'
    ? { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 }
    : { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };
}

export const LEFT_SIDE = [11, 13, 15, 23, 25, 27];
export const RIGHT_SIDE = [12, 14, 16, 24, 26, 28];

/** Lines drawn for the skeleton overlay (body only, no face/hands). */
export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
];

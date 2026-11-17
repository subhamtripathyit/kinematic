import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from './types';

// Keep this version the same as @mediapipe/tasks-vision in package.json.
const VISION_VERSION = '0.10.21';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
// "lite" is fastest. Swap "lite" for "full" in both places for better accuracy.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** The rest of the app only knows this interface, so the model can be swapped later. */
export interface PoseEngine {
  detect(video: HTMLVideoElement, timestamp: number): PoseFrame | null;
  close(): void;
}

export async function createPoseEngine(): Promise<PoseEngine> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);

  const create = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  let landmarker: PoseLandmarker;
  try {
    landmarker = await create('GPU');
  } catch {
    landmarker = await create('CPU');
  }

  let lastTimestamp = -1;

  return {
    detect(video, timestamp) {
      // MediaPipe needs strictly increasing timestamps.
      const ts = Math.max(timestamp, lastTimestamp + 1);
      lastTimestamp = ts;
      const result = landmarker.detectForVideo(video, ts);
      const landmarks = result.landmarks[0];
      if (!landmarks || landmarks.length === 0) return null;
      return { landmarks, timestamp: ts, aspect: video.videoWidth / video.videoHeight };
    },
    close() {
      landmarker.close();
    },
  };
}

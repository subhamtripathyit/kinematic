import { attachStream, openCamera, stopCamera, type CameraFacing } from './camera';
import { createPoseEngine, type PoseEngine } from './pose';

/**
 * Keeps ONE camera stream and ONE pose model alive and shares them between screens.
 * In a routine this makes moving to the next exercise instant: no camera restart,
 * no model reload. Call releaseMedia() when the workout or routine is over.
 */
let current: { facing: CameraFacing; stream: MediaStream } | null = null;
let pending: { facing: CameraFacing; promise: Promise<MediaStream> } | null = null;
let enginePromise: Promise<PoseEngine> | null = null;
/** bumps on every release, so a camera request that finishes too late is thrown away */
let generation = 0;

const isLive = (s: MediaStream) => s.getVideoTracks().some((t) => t.readyState === 'live');

/** Get the camera (reusing the running one if possible) and show it in this <video>. */
export async function acquireCamera(video: HTMLVideoElement, facing: CameraFacing): Promise<MediaStream> {
  if (current && current.facing === facing && isLive(current.stream)) {
    await attachStream(video, current.stream);
    return current.stream;
  }
  if (!pending || pending.facing !== facing) {
    if (current) {
      stopCamera(current.stream);
      current = null;
    }
    const myGeneration = ++generation;
    const promise = openCamera(facing).then(
      (stream) => {
        if (myGeneration !== generation) {
          stopCamera(stream);
          throw new DOMException('The camera request was replaced.', 'AbortError');
        }
        current = { facing, stream };
        pending = null;
        return stream;
      },
      (err) => {
        if (myGeneration === generation) pending = null;
        throw err;
      },
    );
    pending = { facing, promise };
  }
  const stream = await pending.promise;
  await attachStream(video, stream);
  return stream;
}

/** The pose model, loaded once and reused. */
export function getPoseEngine(): Promise<PoseEngine> {
  if (!enginePromise) {
    enginePromise = createPoseEngine().catch((err) => {
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

/** Turn the camera off and free the model. */
export function releaseMedia(): void {
  generation++;
  pending = null;
  if (current) stopCamera(current.stream);
  current = null;
  const engine = enginePromise;
  enginePromise = null;
  engine?.then((e) => e.close()).catch(() => undefined);
}

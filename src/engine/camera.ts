/** 'user' = front (selfie) camera, 'environment' = back camera. */
export type CameraFacing = 'user' | 'environment';

/**
 * Turns on the camera and plays it in the given <video> element.
 * - Upright phone: asks for the camera's full 3:4 view (taller than wide) so nothing is
 *   cropped off the sides and your whole body fits.
 * - Zooms all the way out on phones that support it, to fit your whole body.
 */
export async function startCamera(video: HTMLVideoElement, facing: CameraFacing = 'user'): Promise<MediaStream> {
  const stream = await openCamera(facing);
  await attachStream(video, stream);
  return stream;
}

/** Ask for the camera and return its stream (not attached to any <video> yet). */
export async function openCamera(facing: CameraFacing = 'user'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot access the camera. Use Chrome, Edge or Safari, on HTTPS.');
  }

  const portrait = window.matchMedia('(orientation: portrait)').matches;
  let stream: MediaStream;
  try {
    // Phone cameras capture 4:3. Asking for a tall 9:16 picture made the browser crop the
    // sides off that, so less of your body fit. Upright phone: ask for the camera's full
    // 3:4 view instead (taller than wide, nothing cropped). Laptops: normal 16:9 webcam.
    stream = await navigator.mediaDevices.getUserMedia({
      video: portrait
        ? { facingMode: { ideal: facing }, aspectRatio: { ideal: 3 / 4 }, width: { ideal: 960 }, height: { ideal: 1280 } }
        : { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') throw new Error('Camera permission was denied. Allow camera access in your browser and try again.');
    if (name === 'NotFoundError') throw new Error('No camera was found on this device.');
    if (name === 'NotReadableError') throw new Error('The camera is being used by another app. Close it and try again.');
    throw new Error('Could not start the camera.');
  }

  await zoomAllTheWayOut(stream);
  return stream;
}

/** Show a stream in a <video> element (reusing it if it's already there). */
export async function attachStream(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  if (video.srcObject !== stream) video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
}

/** Some phones start slightly zoomed in. Use the widest view the camera allows. */
async function zoomAllTheWayOut(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== 'function') return;
  const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
  if (!caps.zoom) return;
  try {
    await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as unknown as MediaTrackConstraintSet] });
  } catch {
    // not supported on this device: keep the default zoom
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

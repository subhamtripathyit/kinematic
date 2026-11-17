/** 'user' = front (selfie) camera, 'environment' = back camera. */
export type CameraFacing = 'user' | 'environment';

/**
 * Turns on the camera and plays it in the given <video> element.
 * - Asks for a frame shaped like the screen (portrait on an upright phone), so the
 *   browser doesn't crop off your head and feet.
 * - Zooms all the way out on phones that support it, to fit your whole body.
 */
export async function startCamera(video: HTMLVideoElement, facing: CameraFacing = 'user'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot access the camera. Use Chrome, Edge or Safari, on HTTPS.');
  }

  const portrait = window.matchMedia('(orientation: portrait)').matches;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: portrait ? 720 : 1280 },
        height: { ideal: portrait ? 1280 : 720 },
      },
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

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
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

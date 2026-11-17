/** Turns on the webcam and plays it in the given <video> element. */
export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot access the camera. Use Chrome or Edge, on localhost or HTTPS.');
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') throw new Error('Camera permission was denied. Allow camera access in your browser and try again.');
    if (name === 'NotFoundError') throw new Error('No camera was found on this device.');
    if (name === 'NotReadableError') throw new Error('The camera is being used by another app. Close it and try again.');
    throw new Error('Could not start the camera.');
  }

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

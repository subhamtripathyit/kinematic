import { describe, expect, it } from 'vitest';
import { facingCameraFeedback, outOfFrameFeedback } from '../../src/engine/frameCheck';

const lm = (x: number, y: number, visibility = 0.99) => ({ x, y, z: 0, visibility });
const body = () => Array.from({ length: 33 }, () => lm(0.5, 0.5));

describe('outOfFrameFeedback', () => {
  it('names the feet when they are below the frame', () => {
    const l = body();
    l[27] = lm(0.5, 1.1, 0.1);
    expect(outOfFrameFeedback(l, [11, 23, 25, 27]).message).toMatch(/feet are out of frame/);
  });

  it('names the head/shoulders when they are above the frame', () => {
    const l = body();
    l[11] = lm(0.5, -0.1, 0.1);
    expect(outOfFrameFeedback(l, [11, 23, 25, 27]).message).toMatch(/shoulders are cut off/);
  });

  it('asks to step into the frame when nobody is found', () => {
    expect(outOfFrameFeedback(null, []).message).toMatch(/Step into the frame/);
  });
});

describe('facingCameraFeedback', () => {
  it('asks to turn side-on when facing the camera', () => {
    const l = body();
    l[11] = lm(0.4, 0.3); l[12] = lm(0.6, 0.3); l[23] = lm(0.45, 0.6); l[24] = lm(0.55, 0.6);
    expect(facingCameraFeedback(l, 16 / 9)?.message).toBe('Turn side-on to the camera');
  });

  it('is quiet when standing side-on', () => {
    const l = body();
    l[11] = lm(0.5, 0.3); l[12] = lm(0.51, 0.3); l[23] = lm(0.5, 0.6); l[24] = lm(0.51, 0.6);
    expect(facingCameraFeedback(l, 16 / 9)).toBeNull();
  });
});

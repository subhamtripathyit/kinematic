import { describe, expect, it } from 'vitest';
import { angleAt, elevationDeg, isVisible } from '../../src/engine/geometry';

const p = (x: number, y: number, visibility = 1) => ({ x, y, z: 0, visibility });

describe('angleAt', () => {
  it('measures a right angle', () => {
    expect(angleAt(p(0, 1), p(0, 0), p(1, 0))).toBeCloseTo(90);
  });

  it('measures a straight line', () => {
    expect(angleAt(p(0, 0), p(1, 0), p(2, 0))).toBeCloseTo(180);
  });

  it('corrects for a wide (16:9) video frame', () => {
    // In real pixels this is a 45° angle, even though the raw numbers look different.
    expect(angleAt(p(0.5625, 1), p(0, 0), p(1, 0), 16 / 9)).toBeCloseTo(45);
  });
});

describe('elevationDeg', () => {
  it('is 0 for a flat line and 90 for a vertical one', () => {
    expect(elevationDeg(p(0, 0.5), p(1, 0.5))).toBeCloseTo(0);
    expect(elevationDeg(p(0.5, 1), p(0.5, 0))).toBeCloseTo(90);
  });
});

describe('isVisible', () => {
  it('rejects low-confidence or out-of-frame points', () => {
    expect(isVisible([p(0.5, 0.5)], [0])).toBe(true);
    expect(isVisible([p(0.5, 0.5, 0.2)], [0])).toBe(false);
    expect(isVisible([p(1.3, 0.5)], [0])).toBe(false);
  });
});

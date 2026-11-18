import { describe, expect, it } from 'vitest';
import { createAnalyzerFromDefinition } from '../../src/engine/exercises/createAnalyzer';
import { frontLeg, lunge } from '../../src/engine/exercises/lunge';
import type { Landmark } from '../../src/engine/types';

type P = { x: number; y: number };
type Leg = { hip: P; knee: P; ankle: P };

const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const lerpLeg = (a: Leg, b: Leg, t: number): Leg => ({
  hip: lerp(a.hip, b.hip, t),
  knee: lerp(a.knee, b.knee, t),
  ankle: lerp(a.ankle, b.ankle, t),
});

// Side view, facing right. Front shin vertical, back knee near the floor.
const STAND: Leg = { hip: { x: 0.5, y: 0.5 }, knee: { x: 0.5, y: 0.7 }, ankle: { x: 0.5, y: 0.9 } };
const FRONT: Leg = { hip: { x: 0.5, y: 0.65 }, knee: { x: 0.7, y: 0.66 }, ankle: { x: 0.7, y: 0.86 } };
const BACK: Leg = { hip: { x: 0.5, y: 0.65 }, knee: { x: 0.42, y: 0.84 }, ankle: { x: 0.24, y: 0.88 } };

/** Left leg is the near leg (well seen), right leg the far one (partly hidden). */
function pose(left: Leg, right: Leg): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.3, z: 0, visibility: 0.9 }));
  lms[11] = { x: 0.5, y: left.hip.y - 0.3, z: 0, visibility: 0.9 };
  lms[12] = { x: 0.51, y: left.hip.y - 0.3, z: 0, visibility: 0.6 };
  const put = (leg: Leg, [h, k, a]: number[], visibility: number) => {
    lms[h] = { ...leg.hip, z: 0, visibility };
    lms[k] = { ...leg.knee, z: 0, visibility };
    lms[a] = { ...leg.ankle, z: 0, visibility };
  };
  put(left, [23, 25, 27], 0.9);
  put(right, [24, 26, 28], 0.45);
  return lms;
}

describe('lunge left/right', () => {
  it('tells the front leg from the back leg', () => {
    expect(frontLeg(pose(FRONT, BACK), 1)).toBe('left');
    expect(frontLeg(pose(BACK, FRONT), 1)).toBe('right');
    expect(frontLeg(pose(STAND, STAND), 1)).toBeNull();
  });

  it('credits every rep to the right leg, even with the far leg in front and a few swapped frames', () => {
    const analyzer = createAnalyzerFromDefinition(lunge);
    let ts = 0;
    const rep = (side: 'left' | 'right', swapFrames: number[] = []) => {
      const down = Array.from({ length: 20 }, (_, i) => i / 19);
      const steps = [...down, ...Array(10).fill(1), ...down.map((t) => 1 - t), ...Array(10).fill(0)];
      steps.forEach((t, i) => {
        let left = lerpLeg(STAND, side === 'left' ? FRONT : BACK, t);
        let right = lerpLeg(STAND, side === 'left' ? BACK : FRONT, t);
        if (swapFrames.includes(i)) [left, right] = [right, left]; // pose model mixes the legs up
        ts += 33;
        analyzer.update({ landmarks: pose(left, right), aspect: 1, timestamp: ts });
      });
    };
    for (let i = 0; i < 4; i++) rep('left', [18, 22, 25]); // same leg 4 times in a row
    rep('right', [20, 24]);
    rep('right');
    const { stats } = analyzer.update({ landmarks: pose(STAND, STAND), aspect: 1, timestamp: ts + 33 });
    expect(stats.reps).toBe(6);
    expect(stats.partialReps).toBe(0);
    expect(stats.leftReps).toBe(4);
    expect(stats.rightReps).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { createAnalyzer } from '../../src/engine/exercises';
import type { Landmark } from '../../src/engine/types';

type P = { x: number; y: number };
type Pose = Partial<Record<number, P>>;

// MediaPipe indices (left side is the side facing the camera in these tests)
const L = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 };
const R = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };

/** Builds 33 landmarks. Left side well seen; right side copies left but faint (hidden far side). */
function frame(pose: Pose, farVisibility = 0.3, far: Pose = {}): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
  for (const [k, p] of Object.entries(pose)) lms[Number(k)] = { ...p!, z: 0, visibility: 0.95 };
  const pairs: [number, number][] = Object.keys(L).map((k) => [L[k as keyof typeof L], R[k as keyof typeof R]]);
  for (const [l, r] of pairs) {
    const p = far[r] ?? pose[l];
    if (p) lms[r] = { ...p, z: 0, visibility: farVisibility };
  }
  lms[0] = { x: (pose[L.shoulder]?.x ?? 0.5) + 0.02, y: (pose[L.shoulder]?.y ?? 0.3) - 0.08, z: 0, visibility: 0.9 };
  return lms;
}

/** Point at `len` from `from`, at `deg` degrees (0 = right, 90 = down). */
const at = (from: P, len: number, deg: number): P => ({
  x: from.x + len * Math.cos((deg * Math.PI) / 180),
  y: from.y + len * Math.sin((deg * Math.PI) / 180),
});

/** Runs frames through an analyzer, 33 ms apart. */
function run(id: string, frames: Landmark[][]) {
  const a = createAnalyzer(id);
  let ts = 0;
  let last = a.update({ landmarks: frames[0], aspect: 1, timestamp: ts });
  for (const f of frames.slice(1)) {
    ts += 33;
    last = a.update({ landmarks: f, aspect: 1, timestamp: ts });
  }
  return last.stats;
}

/** angles going down from `top` to `bottom` and back, `reps` times, with pauses. */
function cycle(top: number, bottom: number, reps: number, steps = 15): number[] {
  const out: number[] = [];
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < 10; i++) out.push(top);
    for (let i = 0; i <= steps; i++) out.push(top + ((bottom - top) * i) / steps);
    for (let i = 0; i < 5; i++) out.push(bottom);
    for (let i = 0; i <= steps; i++) out.push(bottom + ((top - bottom) * i) / steps);
  }
  for (let i = 0; i < 10; i++) out.push(top);
  return out;
}

/** Arm with the given elbow angle: upper arm straight down from the shoulder, forearm folding forward. */
function arm(shoulder: P, elbowDeg: number, upperDir = 90): Pose {
  const elbow = at(shoulder, 0.12, upperDir);
  const wrist = at(elbow, 0.12, upperDir + 180 - elbowDeg);
  return { [L.shoulder]: shoulder, [L.elbow]: elbow, [L.wrist]: wrist };
}

const standingLegs = (hip: P): Pose => ({ [L.hip]: hip, [L.knee]: at(hip, 0.2, 90), [L.ankle]: at(hip, 0.4, 90) });

describe('position checks', () => {
  it('counts push-ups in a plank', () => {
    const shoulder = { x: 0.3, y: 0.5 };
    const frames = cycle(170, 80, 3).map((deg) =>
      frame({
        ...arm(shoulder, deg),
        [L.hip]: { x: 0.55, y: 0.52 },
        [L.knee]: { x: 0.68, y: 0.535 },
        [L.ankle]: { x: 0.8, y: 0.55 },
      }),
    );
    expect(run('pushup', frames).reps).toBe(3);
  });

  it('does not count push-ups while standing', () => {
    const shoulder = { x: 0.5, y: 0.3 };
    const frames = cycle(170, 80, 3).map((deg) => frame({ ...arm(shoulder, deg), ...standingLegs({ x: 0.5, y: 0.55 }) }));
    const s = run('pushup', frames);
    expect(s.reps + s.partialReps).toBe(0);
  });

  it('does not count crunches while standing', () => {
    // standing: torso is vertical (elevation 90°), which looked like a huge crunch before
    const frames = cycle(90, 90, 1).map(() => frame({ [L.shoulder]: { x: 0.5, y: 0.3 }, ...standingLegs({ x: 0.5, y: 0.55 }) }));
    const s = run('crunch', frames);
    expect(s.reps + s.partialReps).toBe(0);
  });
});

describe('glitch protection', () => {
  const squatFrame = (kneeDeg: number) => {
    const hip = { x: 0.5, y: 0.5 };
    const knee = at(hip, 0.2, 90 - (180 - kneeDeg) / 2);
    const ankle = at(knee, 0.2, 90 + (180 - kneeDeg) / 2);
    return frame({ [L.shoulder]: { x: 0.48, y: 0.25 }, [L.hip]: hip, [L.knee]: knee, [L.ankle]: ankle });
  };

  it('still counts real squats', () => {
    expect(run('squat', cycle(175, 85, 3).map(squatFrame)).reps).toBe(3);
  });

  it('ignores a one-frame jump while standing still', () => {
    const angles = Array(30).fill(175);
    angles[15] = 70; // one bad frame
    const s = run('squat', angles.map(squatFrame));
    expect(s.reps + s.partialReps).toBe(0);
  });
});

describe('hidden far side', () => {
  it('does not count curls from a guessed far arm', () => {
    // near arm stays straight; the hidden far arm is "seen" curling at low visibility
    const shoulder = { x: 0.5, y: 0.3 };
    const frames = cycle(165, 40, 3).map((deg) => {
      const farArm = arm(shoulder, deg);
      return frame({ ...arm(shoulder, 165), ...standingLegs({ x: 0.5, y: 0.55 }) }, 0.55, {
        [R.shoulder]: farArm[L.shoulder],
        [R.elbow]: farArm[L.elbow],
        [R.wrist]: farArm[L.wrist],
      });
    });
    expect(run('bicep-curl', frames).reps).toBe(0);
  });

  it('still counts curls with the arm the camera sees', () => {
    const shoulder = { x: 0.5, y: 0.3 };
    const frames = cycle(165, 40, 3).map((deg) => frame({ ...arm(shoulder, deg), ...standingLegs({ x: 0.5, y: 0.55 }) }));
    expect(run('bicep-curl', frames).reps).toBe(3);
  });
});

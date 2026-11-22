import { describe, expect, it } from 'vitest';
import { createAnalyzer } from '../../src/engine/exercises';
import type { Landmark } from '../../src/engine/types';

/**
 * Every exercise, simulated three ways: done right (must count), too shallow (must not count)
 * and in the wrong body position (must not count). Timed holds: good form runs the timer, bad form doesn't.
 * Poses are simple stick figures, y grows downward, side-view people face right (+x).
 */

type P = { x: number; y: number };
interface Side {
  shoulder: P;
  elbow: P;
  wrist: P;
  hip: P;
  knee: P;
  ankle: P;
}
const IDX = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32 },
};

const rad = (d: number) => (d * Math.PI) / 180;
/** point `len` away at direction `deg` (0 = right, 90 = down, -90 = up, 180 = left) */
const at = (p: P, len: number, deg: number): P => ({ x: p.x + len * Math.cos(rad(deg)), y: p.y + len * Math.sin(rad(deg)) });

/** near = left side (well seen); far = right side, partly hidden (side view) or fully seen (front view) */
function toLandmarks(near: Side, far: Side | null, farVis: number, nose?: P): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.05 }));
  const put = (s: Side, idx: typeof IDX.left, vis: number) => {
    for (const k of ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'] as const) lms[idx[k]] = { ...s[k], z: 0, visibility: vis };
    // feet flat: heel just behind and toe just ahead of the ankle, on the same level
    lms[idx.heel] = { x: s.ankle.x - 0.02, y: s.ankle.y + 0.01, z: 0, visibility: vis };
    lms[idx.toe] = { x: s.ankle.x + 0.05, y: s.ankle.y + 0.01, z: 0, visibility: vis };
  };
  put(near, IDX.left, 0.95);
  put(far ?? near, IDX.right, far ? farVis : 0.3);
  const n = nose ?? at(near.shoulder, 0.08, -80);
  lms[0] = { ...n, z: 0, visibility: 0.9 };
  return lms;
}

function run(id: string, frames: Landmark[][], level?: 1 | 2 | 3 | 4 | 5 | 6) {
  const a = createAnalyzer(id, level ? { level } : undefined);
  let ts = 0;
  let r = a.update({ landmarks: frames[0], aspect: 1, timestamp: ts });
  for (const f of frames.slice(1)) {
    ts += 33;
    r = a.update({ landmarks: f, aspect: 1, timestamp: ts });
  }
  return r.stats;
}

/** 0 → 1 → 0 progress values for `reps` reps, with pauses at the top and bottom */
function cycle(reps: number, steps = 18): number[] {
  const out: number[] = [];
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < 10; i++) out.push(0);
    for (let i = 0; i <= steps; i++) out.push(i / steps);
    for (let i = 0; i < 6; i++) out.push(1);
    for (let i = 0; i <= steps; i++) out.push(1 - i / steps);
  }
  for (let i = 0; i < 10; i++) out.push(0);
  return out;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- pose builders ----------

/** Standing side view with a knee angle and a forward torso lean (degrees from vertical). */
function standing(kneeDeg: number, lean: number, armElbow = 170, armFromBody = 5): Side {
  const a = (180 - kneeDeg) / 2;
  const ankle = { x: 0.5, y: 0.9 };
  const knee = at(ankle, 0.2, -90 + a);
  const hip = at(knee, 0.2, -90 - a);
  const shoulder = at(hip, 0.28, -90 + lean);
  const elbow = at(shoulder, 0.12, 90 - armFromBody);
  const wrist = at(elbow, 0.12, 90 - armFromBody - (180 - armElbow));
  return { shoulder, elbow, wrist, hip, knee, ankle };
}

/** Lying on the back (side view), knees bent up; torso raised `torsoDeg` off the floor. */
function lying(torsoDeg: number, hipLift = 0): Side {
  const hip = { x: 0.45, y: 0.85 - hipLift };
  const ankle = { x: 0.75, y: 0.88 };
  const knee = { x: 0.62, y: 0.68 };
  const shoulder = at(hip, 0.28, 180 + torsoDeg);
  const elbow = at(shoulder, 0.1, 10);
  const wrist = at(elbow, 0.1, -30);
  return { shoulder, elbow, wrist, hip, knee, ankle };
}

/** Plank (side view) with an elbow angle; body straight from shoulder to ankle. */
function plank(elbowDeg: number, bodyDropDeg = 0): Side {
  const half = (180 - elbowDeg) / 2;
  const wrist = { x: 0.3, y: 0.85 };
  const elbow = at(wrist, 0.13, -90 + half);
  const shoulder = at(elbow, 0.13, -90 - half);
  const hip = at(shoulder, 0.27, 5 + bodyDropDeg);
  const knee = at(hip, 0.2, 5 - bodyDropDeg);
  const ankle = at(knee, 0.2, 5 - bodyDropDeg);
  return { shoulder, elbow, wrist, hip, knee, ankle };
}

/** Front view: one side's arm/leg, mirrored for the other side. `cx` is the body centre. */
function frontPair(build: (dir: 1 | -1) => Side): [Side, Side] {
  return [build(-1), build(1)];
}

// ---------- the exercises ----------

interface Case {
  id: string;
  /** progress 0..1 -> pose (full range at 1) */
  good: (t: number) => Landmark[];
  /** same movement but only part of the way */
  shallow?: (t: number) => Landmark[];
  /** the same joint movement done in the wrong body position */
  wrongPosition?: (t: number) => Landmark[];
}

const side = (s: Side) => toLandmarks(s, null, 0.3);

const front = (build: (dir: 1 | -1) => Side, nose?: P) => {
  const [l, r] = frontPair(build);
  return toLandmarks(l, r, 0.95, nose);
};

/** front-view standing body; arm angle from the body (0 = down, 90 = sideways, 180 = up) and elbow angle */
const frontArms = (armDeg: number, elbowDeg = 175, feetApart = 0.05) => (dir: 1 | -1): Side => {
  const shoulder = { x: 0.5 + dir * 0.08, y: 0.35 };
  const hip = { x: 0.5 + dir * 0.06, y: 0.6 };
  const ankle = { x: 0.5 + dir * (0.06 + feetApart), y: 0.9 };
  const knee = { x: (hip.x + ankle.x) / 2, y: 0.75 };
  const upper = 90 - dir * armDeg; // 90 = straight down; raising swings outwards
  const elbow = at(shoulder, 0.12, dir > 0 ? 90 - armDeg : 90 + armDeg);
  const forearmDir = (dir > 0 ? 90 - armDeg : 90 + armDeg) + (dir > 0 ? -1 : 1) * (180 - elbowDeg);
  void upper;
  const wrist = at(elbow, 0.12, forearmDir);
  return { shoulder, elbow, wrist, hip, knee, ankle };
};

/** front view, upper arm straight out sideways, forearm pointing up; elbow angle 90 → pressing to 180 */
const pressArms = (elbowDeg: number) => (dir: 1 | -1): Side => {
  const shoulder = { x: 0.5 + dir * 0.08, y: 0.4 };
  const hip = { x: 0.5 + dir * 0.06, y: 0.65 };
  const ankle = { x: 0.5 + dir * 0.07, y: 0.92 };
  const knee = { x: 0.5 + dir * 0.065, y: 0.78 };
  // upper arm tilts up as the arm straightens: from sideways (0°) to straight up
  const upperUp = ((elbowDeg - 90) / 90) * 80; // 0..80 degrees above horizontal
  const elbow = at(shoulder, 0.12, dir > 0 ? -upperUp : 180 + upperUp);
  const forearm = dir > 0 ? -upperUp - (180 - elbowDeg) : 180 + upperUp + (180 - elbowDeg);
  const wrist = at(elbow, 0.12, forearm);
  return { shoulder, elbow, wrist, hip, knee, ankle };
};

/** hanging (front view) with an elbow angle: hands on the bar (y = 0.12), wider than the shoulders */
const hangArms = (elbowDeg: number) => (dir: 1 | -1): Side => {
  const L = 0.13;
  const wrist = { x: 0.5 + dir * 0.16, y: 0.12 };
  const reach = 2 * L * Math.sin(rad(elbowDeg / 2)); // shoulder-to-wrist distance for this elbow angle
  const dx = 0.08; // hands this much wider than the shoulders
  const shoulder = { x: wrist.x - dir * dx, y: wrist.y + Math.sqrt(Math.max(0, reach * reach - dx * dx)) };
  // elbow: halfway between shoulder and wrist, pushed outwards (away from the body)
  const mid = { x: (shoulder.x + wrist.x) / 2, y: (shoulder.y + wrist.y) / 2 };
  const off = Math.sqrt(Math.max(0, L * L - (reach / 2) ** 2));
  const ux = (wrist.x - shoulder.x) / reach;
  const uy = (wrist.y - shoulder.y) / reach;
  let n = { x: -uy, y: ux };
  if (n.x * dir < 0) n = { x: uy, y: -ux };
  const elbow = { x: mid.x + n.x * off, y: mid.y + n.y * off };
  const hip = { x: 0.5 + dir * 0.06, y: shoulder.y + 0.27 };
  const knee = { x: hip.x, y: hip.y + 0.2 };
  const ankle = { x: hip.x, y: knee.y + 0.2 };
  return { shoulder, elbow, wrist, hip, knee, ankle };
};

const CASES: Case[] = [
  {
    id: 'squat',
    good: (t) => side(standing(lerp(175, 85, t), lerp(5, 35, t))),
    shallow: (t) => side(standing(lerp(175, 125, t), lerp(5, 15, t))),
    wrongPosition: (t) => {
      // lying on the back bending the knees
      const s = lying(0);
      const k = lerp(175, 85, t);
      const knee = at(s.hip, 0.2, -((180 - k) / 2));
      return side({ ...s, knee, ankle: at(knee, 0.2, (180 - k) / 2) });
    },
  },
  {
    id: 'deadlift',
    good: (t) => {
      const s = standing(165, 0);
      const shoulder = at(s.hip, 0.28, -90 + lerp(5, 80, t));
      return side({ ...s, shoulder, elbow: at(shoulder, 0.12, 90), wrist: at(shoulder, 0.24, 90) });
    },
    shallow: (t) => {
      const s = standing(165, 0);
      const shoulder = at(s.hip, 0.28, -90 + lerp(5, 40, t));
      return side({ ...s, shoulder, elbow: at(shoulder, 0.12, 90), wrist: at(shoulder, 0.24, 90) });
    },
  },
  {
    id: 'glute-bridge',
    good: (t) => {
      const s = lying(0, lerp(0, 0.17, t));
      const shoulder = { x: 0.2, y: 0.86 };
      return side({ ...s, shoulder, elbow: at(shoulder, 0.1, 0), wrist: at(shoulder, 0.2, 0) });
    },
    shallow: (t) => {
      const s = lying(0, lerp(0, 0.05, t));
      const shoulder = { x: 0.2, y: 0.86 };
      return side({ ...s, shoulder, elbow: at(shoulder, 0.1, 0), wrist: at(shoulder, 0.2, 0) });
    },
    wrongPosition: (t) => side(standing(175, 0, 170, lerp(5, 30, t))),
  },
  {
    id: 'pushup',
    good: (t) => side(plank(lerp(170, 80, t))),
    shallow: (t) => side(plank(lerp(170, 125, t))),
    wrongPosition: (t) => side(standing(175, 0, lerp(170, 80, t))),
  },
  {
    id: 'dips',
    good: (t) => {
      const e = lerp(165, 85, t);
      const half = (180 - e) / 2;
      const wrist = { x: 0.5, y: 0.6 };
      const elbow = at(wrist, 0.13, -90 - half);
      const shoulder = at(elbow, 0.13, -90 + half);
      const hip = at(shoulder, 0.28, 90 - 15);
      return side({ shoulder, elbow, wrist, hip, knee: at(hip, 0.2, 100), ankle: at(hip, 0.38, 110) });
    },
    shallow: (t) => {
      const e = lerp(165, 125, t);
      const half = (180 - e) / 2;
      const wrist = { x: 0.5, y: 0.6 };
      const elbow = at(wrist, 0.13, -90 - half);
      const shoulder = at(elbow, 0.13, -90 + half);
      const hip = at(shoulder, 0.28, 90 - 15);
      return side({ shoulder, elbow, wrist, hip, knee: at(hip, 0.2, 100), ankle: at(hip, 0.38, 110) });
    },
    wrongPosition: (t) => side(plank(lerp(165, 85, t))),
  },
  {
    id: 'crunch',
    good: (t) => side(lying(lerp(3, 40, t))),
    shallow: (t) => side(lying(lerp(3, 22, t))),
    wrongPosition: (t) => side(standing(175, lerp(0, 40, t))),
  },
  {
    id: 'situp',
    good: (t) => side(lying(lerp(3, 75, t))),
    shallow: (t) => side(lying(lerp(3, 40, t))),
    wrongPosition: (t) => side(standing(175, lerp(0, 40, t))),
  },
  {
    id: 'knee-raise',
    good: (t) => {
      const shoulder = { x: 0.5, y: 0.25 };
      const hip = at(shoulder, 0.28, 90);
      const knee = at(hip, 0.2, lerp(90, -5, t));
      return side({ shoulder, elbow: at(shoulder, 0.12, -90), wrist: at(shoulder, 0.24, -90), hip, knee, ankle: at(knee, 0.2, 90) });
    },
    shallow: (t) => {
      const shoulder = { x: 0.5, y: 0.25 };
      const hip = at(shoulder, 0.28, 90);
      const knee = at(hip, 0.2, lerp(90, 10, t));
      return side({ shoulder, elbow: at(shoulder, 0.12, -90), wrist: at(shoulder, 0.24, -90), hip, knee, ankle: at(knee, 0.2, 90) });
    },
    wrongPosition: (t) => {
      // marching on the spot, arms down
      const s = standing(175, 0);
      const knee = at(s.hip, 0.2, lerp(90, -5, t));
      return side({ ...s, knee, ankle: at(knee, 0.2, 90) });
    },
  },
  {
    id: 'bicep-curl',
    good: (t) => side(standing(175, 0, lerp(165, 40, t))),
    shallow: (t) => side(standing(175, 0, lerp(165, 110, t))),
    wrongPosition: (t) => side({ ...plank(170), ...{} , elbow: plank(170).elbow, wrist: plank(lerp(170, 40, t)).wrist }),
  },
  {
    id: 'mountain-climbers',
    // head on the left, feet on the right: leg straight back = 5°, knee driven to the chest = ~125°
    good: (t) => {
      const s = plank(170);
      const k = at(s.hip, 0.2, lerp(5, 125, t));
      return side({ ...s, knee: k, ankle: at(k, 0.2, lerp(5, 60, t)) });
    },
    shallow: (t) => {
      const s = plank(170);
      const k = at(s.hip, 0.2, lerp(5, 65, t));
      return side({ ...s, knee: k, ankle: at(k, 0.2, 5) });
    },
    wrongPosition: (t) => {
      const s = standing(175, 0);
      const knee = at(s.hip, 0.2, lerp(90, -5, t));
      return side({ ...s, knee, ankle: at(knee, 0.2, 90) });
    },
  },
  {
    id: 'pullup',
    good: (t) => {
      const lms = front(hangArms(lerp(170, 55, t)));
      // nose: above the bar at the top
      const sy = lms[11].y;
      lms[0] = { x: 0.5, y: sy - 0.12, z: 0, visibility: 0.9 };
      return lms;
    },
    shallow: (t) => {
      const lms = front(hangArms(lerp(170, 120, t)));
      lms[0] = { x: 0.5, y: lms[11].y - 0.12, z: 0, visibility: 0.9 };
      return lms;
    },
    wrongPosition: (t) => front(frontArms(10, lerp(170, 55, t))),
  },
  {
    id: 'shoulder-press',
    good: (t) => front(pressArms(lerp(90, 175, t))),
    shallow: (t) => front(pressArms(lerp(90, 130, t))),
  },
  {
    id: 'lateral-raise',
    good: (t) => front(frontArms(lerp(10, 90, t), 165)),
    shallow: (t) => front(frontArms(lerp(10, 60, t), 165)),
  },
  {
    id: 'jumping-jacks',
    good: (t) => front(frontArms(lerp(10, 165, t)), undefined),
    shallow: (t) => front(frontArms(lerp(10, 110, t))),
  },
];

// jumping jacks need the feet to jump wide at the top
const jacks = CASES.find((c) => c.id === 'jumping-jacks')!;
jacks.good = (t) => front(frontArms(lerp(10, 165, t), 175, lerp(0.02, 0.2, t)));

describe('every rep exercise judges properly', () => {
  for (const c of CASES) {
    it(`${c.id}: counts reps done right`, () => {
      const s = run(c.id, cycle(3).map(c.good));
      expect(s.reps, `${c.id} reps`).toBe(3);
    });
    if (c.shallow) {
      it(`${c.id}: does not count shallow reps`, () => {
        const s = run(c.id, cycle(3).map(c.shallow!));
        expect(s.reps, `${c.id} reps`).toBe(0);
        expect(s.partialReps > 0, `${c.id} partials`).toBe(true);
      });
    }
    if (c.wrongPosition) {
      it(`${c.id}: does not count in the wrong position`, () => {
        const s = run(c.id, cycle(3).map(c.wrongPosition!));
        expect(s.reps, `${c.id} reps`).toBe(0);
      });
    }
  }
});

describe('timed holds', () => {
  const hold = (id: string, frame: Landmark[], seconds = 3) => run(id, Array.from({ length: Math.round(seconds * 30) }, () => frame));

  it('plank: good form runs the timer, sagging hips stop it', () => {
    expect(hold('plank', side(plank(170))).holdMs).toBeGreaterThan(2500);
    expect(hold('plank', side(plank(170, 12))).holdMs).toBeLessThan(500);
  });

  it('wall sit: knees at 90° runs the timer, standing does not', () => {
    const sit = (knee: number) => {
      const s = standing(knee, 0);
      return side(s);
    };
    expect(hold('wall-sit', sit(90)).holdMs).toBeGreaterThan(2500);
    expect(hold('wall-sit', sit(175)).holdMs).toBeLessThan(500);
  });

  it('side plank: straight body runs the timer', () => {
    // front view: body lying sideways across the frame, straight line
    const shoulder = { x: 0.25, y: 0.6 };
    const hip = at(shoulder, 0.28, 10);
    const knee = at(hip, 0.2, 10);
    const ankle = at(knee, 0.2, 10);
    const s: Side = { shoulder, elbow: at(shoulder, 0.12, 90), wrist: at(shoulder, 0.24, 90), hip, knee, ankle };
    expect(hold('side-plank', toLandmarks(s, null, 0.3)).holdMs).toBeGreaterThan(2500);
  });
});

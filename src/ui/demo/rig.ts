/**
 * A tiny 2D stick-figure "rig" for the form demos.
 * Every limb angle is in degrees, measured from straight DOWN, positive = toward the
 * direction the figure faces (side view) or outward (front view).
 */
export interface Pt {
  x: number;
  y: number;
}

/** Side view, figure facing right. */
export interface SidePose {
  kind: 'side';
  /** torso lean: 0 = upright, + = leaning forward, -90 = lying on back (head to the left) */
  torso: number;
  /** direction of the head from the shoulders (defaults to the torso direction) */
  head?: number;
  thigh: number;
  shin: number;
  /** far leg (defaults to the near leg) */
  thigh2?: number;
  shin2?: number;
  upperArm: number;
  forearm: number;
  upperArm2?: number;
  forearm2?: number;
}

/** Front view, facing the viewer. */
export interface FrontPose {
  kind: 'front';
  /** 0 = arm down at your side, 90 = straight out, 180 = straight up */
  armL: number;
  forearmL: number;
  armR?: number;
  forearmR?: number;
  /** how far apart the legs are */
  legSpread: number;
  /** rotate the whole figure (side plank) */
  tilt?: number;
}

export type Pose = SidePose | FrontPose;

export interface Skeleton {
  points: Record<string, Pt>;
  /** [from, to, isFarSide] */
  bones: [string, string, boolean][];
  head: string;
}

export const HEAD_R = 9;
const LEN = { torso: 50, thigh: 42, shin: 42, upperArm: 30, forearm: 28, neck: 13 };
const rad = (d: number) => (d * Math.PI) / 180;
/** Go `len` from `from` in direction `angle` (0 = down, + = forward/right). */
const go = (from: Pt, len: number, angle: number, sideSign = 1): Pt => ({
  x: from.x + sideSign * len * Math.sin(rad(angle)),
  y: from.y + len * Math.cos(rad(angle)),
});

function buildSide(p: SidePose): Skeleton {
  const hip = { x: 0, y: 0 };
  const shoulder = { x: LEN.torso * Math.sin(rad(p.torso)), y: -LEN.torso * Math.cos(rad(p.torso)) };
  const h = p.head ?? p.torso;
  const head = { x: shoulder.x + LEN.neck * Math.sin(rad(h)), y: shoulder.y - LEN.neck * Math.cos(rad(h)) };
  const knee = go(hip, LEN.thigh, p.thigh);
  const ankle = go(knee, LEN.shin, p.shin);
  const knee2 = go(hip, LEN.thigh, p.thigh2 ?? p.thigh);
  const ankle2 = go(knee2, LEN.shin, p.shin2 ?? p.shin);
  const elbow = go(shoulder, LEN.upperArm, p.upperArm);
  const wrist = go(elbow, LEN.forearm, p.forearm);
  const elbow2 = go(shoulder, LEN.upperArm, p.upperArm2 ?? p.upperArm);
  const wrist2 = go(elbow2, LEN.forearm, p.forearm2 ?? p.forearm);
  return {
    points: { head, shoulder, hip, knee, ankle, knee2, ankle2, elbow, wrist, elbow2, wrist2 },
    bones: [
      ['hip', 'knee2', true],
      ['knee2', 'ankle2', true],
      ['shoulder', 'elbow2', true],
      ['elbow2', 'wrist2', true],
      ['shoulder', 'hip', false],
      ['hip', 'knee', false],
      ['knee', 'ankle', false],
      ['shoulder', 'elbow', false],
      ['elbow', 'wrist', false],
    ],
    head: 'head',
  };
}

function buildFront(p: FrontPose): Skeleton {
  const sL = { x: -15, y: -50 };
  const sR = { x: 15, y: -50 };
  const hL = { x: -10, y: 0 };
  const hR = { x: 10, y: 0 };
  const neck = { x: 0, y: -50 };
  const head = { x: 0, y: -63 };
  const hip = { x: 0, y: 0 };
  const eL = go(sL, LEN.upperArm, p.armL, -1);
  const wL = go(eL, LEN.forearm, p.forearmL, -1);
  const eR = go(sR, LEN.upperArm, p.armR ?? p.armL, 1);
  const wR = go(eR, LEN.forearm, p.forearmR ?? p.forearmL, 1);
  const kL = go(hL, LEN.thigh, p.legSpread, -1);
  const aL = go(kL, LEN.shin, p.legSpread, -1);
  const kR = go(hR, LEN.thigh, p.legSpread, 1);
  const aR = go(kR, LEN.shin, p.legSpread, 1);
  const points: Record<string, Pt> = { sL, sR, hL, hR, neck, head, hip, eL, wL, eR, wR, kL, aL, kR, aR };

  if (p.tilt) {
    const c = Math.cos(rad(p.tilt));
    const s = Math.sin(rad(p.tilt));
    for (const k of Object.keys(points)) {
      const { x, y } = points[k];
      points[k] = { x: x * c - y * s, y: x * s + y * c };
    }
  }
  return {
    points,
    bones: [
      ['sL', 'sR', false],
      ['sL', 'hL', false],
      ['sR', 'hR', false],
      ['hL', 'hR', false],
      ['sL', 'eL', false],
      ['eL', 'wL', false],
      ['sR', 'eR', false],
      ['eR', 'wR', false],
      ['hL', 'kL', false],
      ['kL', 'aL', false],
      ['hR', 'kR', false],
      ['kR', 'aR', false],
    ],
    head: 'head',
  };
}

export function buildSkeleton(p: Pose): Skeleton {
  return p.kind === 'side' ? buildSide(p) : buildFront(p);
}

/** Blend two poses: t = 0 -> a, t = 1 -> b. */
export function lerpPose<P extends Pose>(a: P, b: P, t: number): P {
  const out: Record<string, unknown> = { kind: a.kind };
  const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => k !== 'kind'));
  const ra = a as unknown as Record<string, number | undefined>;
  const rb = b as unknown as Record<string, number | undefined>;
  for (const k of keys) {
    const va = ra[k];
    const vb = rb[k];
    if (va === undefined && vb === undefined) continue;
    const x = va ?? vb ?? 0;
    const y = vb ?? va ?? 0;
    out[k] = x + (y - x) * t;
  }
  return out as unknown as P;
}

export interface Placement {
  /** 'ground': lowest point sits on the floor. Or pin a joint to a height (hands on a bar). */
  y: { mode: 'ground' } | { mode: 'joint'; joint: string; y: number };
  /** keep this joint at a fixed x so the figure doesn't slide around */
  x: { joint: string; x: number };
  scale?: number;
}

export const GROUND_Y = 188;

/** Scale and move the skeleton into the 240 x 200 drawing. */
export function place(s: Skeleton, pl: Placement): Skeleton {
  const scale = pl.scale ?? 1;
  const pts: Record<string, Pt> = {};
  for (const [k, v] of Object.entries(s.points)) pts[k] = { x: v.x * scale, y: v.y * scale };
  const pin = pts[pl.x.joint];
  const dx = pl.x.x - pin.x;
  let dy: number;
  if (pl.y.mode === 'ground') {
    // the head is a circle drawn around its point, so leave it out of "lowest point"
    const lowest = Math.max(...Object.entries(pts).filter(([k]) => k !== s.head).map(([, v]) => v.y));
    dy = GROUND_Y - lowest;
  } else {
    dy = pl.y.y - pts[pl.y.joint].y;
  }
  for (const k of Object.keys(pts)) pts[k] = { x: pts[k].x + dx, y: pts[k].y + dy };
  return { ...s, points: pts };
}

import type { Placement, Pose } from './rig';

export interface Demo {
  /** two key poses; the animation moves back and forth between them */
  frames: [Pose, Pose];
  periodMs: number;
  placement: Placement;
  props?: ('wall' | 'bar' | 'bars')[];
  /** timed exercise: shown as a still hold */
  hold?: boolean;
  /** one-line how-to */
  howTo: string;
  mistakes: string[];
}

const ground = (joint: string, x: number, scale?: number): Placement => ({ y: { mode: 'ground' }, x: { joint, x }, scale });
const onBar = (joint: string, x: number, y: number, scale?: number): Placement => ({
  y: { mode: 'joint', joint, y },
  x: { joint, x },
  scale,
});

const standing = { kind: 'side' as const, torso: 0, thigh: 0, shin: 0, upperArm: 0, forearm: 0 };
const lyingKneesBent = { kind: 'side' as const, torso: -90, head: -65, thigh: 140, shin: 40 };

export const DEMOS: Record<string, Demo> = {
  squat: {
    frames: [
      { ...standing, torso: 5, upperArm: 15, forearm: 20 },
      { kind: 'side', torso: 40, thigh: 85, shin: -30, upperArm: 85, forearm: 85 },
    ],
    periodMs: 2600,
    placement: ground('ankle', 110),
    howTo: 'Feet shoulder-width apart. Sit back and down until your thighs are parallel to the floor, chest up, then stand tall.',
    mistakes: ['Knees caving inward', 'Heels lifting off the floor', 'Not going deep enough'],
  },
  lunge: {
    frames: [
      { kind: 'side', torso: 0, thigh: 12, shin: 0, thigh2: -12, shin2: -5, upperArm: 0, forearm: 0 },
      { kind: 'side', torso: 0, thigh: 80, shin: -5, thigh2: -25, shin2: -95, upperArm: 0, forearm: 0 },
    ],
    periodMs: 2600,
    placement: ground('ankle', 140),
    howTo: 'Step forward and lower until both knees are bent about 90°, back knee close to the floor. Push back up through the front heel.',
    mistakes: ['Front knee pushing past your toes', 'Leaning your torso forward', 'Not dropping the back knee low enough'],
  },
  'glute-bridge': {
    frames: [
      { ...lyingKneesBent, upperArm: 90, forearm: 90 },
      { kind: 'side', torso: -115, head: -60, thigh: 105, shin: 40, upperArm: 90, forearm: 90 },
    ],
    periodMs: 2600,
    placement: ground('ankle', 185),
    howTo: 'Lie on your back, knees bent, feet flat. Squeeze your glutes and lift your hips until your body makes a straight line from knees to shoulders.',
    mistakes: ['Not lifting your hips high enough', 'Arching your lower back at the top', 'Pushing through your toes instead of your heels'],
  },
  'wall-sit': {
    frames: [
      { kind: 'side', torso: 0, thigh: 90, shin: 0, upperArm: 0, forearm: 0 },
      { kind: 'side', torso: 0, thigh: 88, shin: 0, upperArm: 0, forearm: 0 },
    ],
    periodMs: 3000,
    hold: true,
    placement: ground('ankle', 140),
    props: ['wall'],
    howTo: 'Back flat against the wall, slide down until your knees are at 90° and thighs parallel to the floor. Hold.',
    mistakes: ['Thighs not parallel to the floor', 'Knees going past your toes', 'Back coming off the wall'],
  },
  pushup: {
    frames: [
      { kind: 'side', torso: 64, thigh: -64, shin: -64, upperArm: 0, forearm: 0 },
      { kind: 'side', torso: 76, thigh: -76, shin: -76, upperArm: -70, forearm: 40 },
    ],
    periodMs: 2400,
    placement: ground('ankle', 30),
    howTo: 'Hands under your shoulders, body in one straight line. Lower your chest close to the floor, then push back up.',
    mistakes: ['Hips sagging toward the floor', 'Hips piking up too high', 'Not lowering your chest far enough'],
  },
  dips: {
    frames: [
      { kind: 'side', torso: 8, thigh: 20, shin: -70, upperArm: 0, forearm: 0 },
      { kind: 'side', torso: 20, thigh: 30, shin: -70, upperArm: -75, forearm: 15 },
    ],
    periodMs: 2400,
    placement: onBar('wrist', 120, 100),
    props: ['bars'],
    howTo: 'Arms straight on the bars. Bend your elbows to lower until your upper arms are about parallel to the floor, then press back up.',
    mistakes: ['Not going low enough', 'Shrugging your shoulders up to your ears', 'Swinging your legs'],
  },
  pullup: {
    frames: [
      { kind: 'front', armL: 165, forearmL: 170, legSpread: 3 },
      { kind: 'front', armL: 70, forearmL: 165, legSpread: 3 },
    ],
    periodMs: 2600,
    placement: { y: { mode: 'joint', joint: 'wL', y: 18 }, x: { joint: 'hip', x: 120 }, scale: 0.85 },
    props: ['bar'],
    howTo: 'Hang with straight arms. Pull your chest up until your chin is over the bar, then lower all the way down.',
    mistakes: ['Not going all the way down between reps', 'Chin not getting over the bar', 'Swinging or kicking your legs'],
  },
  deadlift: {
    frames: [
      { ...standing },
      { kind: 'side', torso: 75, thigh: 12, shin: -8, upperArm: 0, forearm: 0 },
    ],
    periodMs: 2800,
    placement: ground('ankle', 110),
    howTo: 'Soft knees. Push your hips back and lower the weight along your legs with a flat back, then drive your hips forward to stand.',
    mistakes: ['Rounding your back', 'Bending your knees too much (turning it into a squat)', 'Letting the weight drift away from your legs'],
  },
  'shoulder-press': {
    frames: [
      { kind: 'front', armL: 85, forearmL: 175, legSpread: 6 },
      { kind: 'front', armL: 165, forearmL: 175, legSpread: 6 },
    ],
    periodMs: 2400,
    placement: ground('hip', 120, 0.9),
    howTo: 'Hands at shoulder height, elbows out. Press straight up until your arms are locked out overhead, then lower with control.',
    mistakes: ['Not pressing all the way overhead', 'Arching your lower back', 'Pushing your head forward'],
  },
  'lateral-raise': {
    frames: [
      { kind: 'front', armL: 12, forearmL: 15, legSpread: 6 },
      { kind: 'front', armL: 88, forearmL: 92, legSpread: 6 },
    ],
    periodMs: 2600,
    placement: ground('hip', 120),
    howTo: 'Arms at your sides, slight bend in the elbows. Raise them out to the sides up to shoulder height, then lower slowly.',
    mistakes: ['Raising above shoulder height', 'Swinging your body to lift', 'Shrugging your shoulders'],
  },
  'bicep-curl': {
    frames: [
      { ...standing, upperArm: 3, forearm: 5 },
      { ...standing, upperArm: 5, forearm: 150 },
    ],
    periodMs: 2400,
    placement: ground('ankle', 110),
    howTo: 'Elbows pinned to your sides. Curl the weight up to your shoulders, then lower until your arms are straight.',
    mistakes: ['Swinging your back to lift the weight', 'Letting your elbows drift forward', 'Not straightening your arms at the bottom'],
  },
  crunch: {
    frames: [
      { ...lyingKneesBent, upperArm: 120, forearm: 110 },
      { kind: 'side', torso: -60, head: -40, thigh: 140, shin: 40, upperArm: 100, forearm: 95 },
    ],
    periodMs: 2200,
    placement: ground('ankle', 185),
    howTo: 'Lie on your back, knees bent. Curl your shoulders off the floor using your abs, then lower slowly.',
    mistakes: ['Pulling on your neck with your hands', 'Using momentum instead of your abs', "Lifting all the way up (that's a sit-up)"],
  },
  situp: {
    frames: [
      { ...lyingKneesBent, upperArm: 120, forearm: 110 },
      { kind: 'side', torso: -15, head: -10, thigh: 140, shin: 40, upperArm: 70, forearm: 70 },
    ],
    periodMs: 2600,
    placement: ground('ankle', 185),
    howTo: 'Lie on your back, knees bent, feet flat. Sit all the way up, then roll back down with control.',
    mistakes: ['Feet lifting off the floor', 'Using momentum and jerking up', 'Pulling on your neck'],
  },
  'knee-raise': {
    frames: [
      { kind: 'side', torso: 0, thigh: 0, shin: 0, upperArm: 180, forearm: 180 },
      { kind: 'side', torso: -8, thigh: 95, shin: 5, upperArm: 180, forearm: 180 },
    ],
    periodMs: 2400,
    placement: onBar('wrist', 120, 18, 0.85),
    props: ['bar'],
    howTo: 'Hang from the bar. Raise your knees up to hip height without swinging, then lower them slowly.',
    mistakes: ['Swinging your body', 'Not raising your knees to hip height', 'Dropping your legs too fast'],
  },
  plank: {
    frames: [
      { kind: 'side', torso: 77, thigh: -77, shin: -77, upperArm: 0, forearm: 90 },
      { kind: 'side', torso: 76.5, thigh: -76.5, shin: -76.5, upperArm: 0, forearm: 90 },
    ],
    periodMs: 3000,
    hold: true,
    placement: ground('ankle', 30),
    howTo: 'Forearms on the floor, elbows under your shoulders, body in one straight line from head to heels. Hold.',
    mistakes: ['Hips sagging toward the floor', 'Hips piked up too high', 'Dropping your head'],
  },
  'side-plank': {
    frames: [
      { kind: 'front', armL: 62, forearmL: 62, armR: 118, forearmR: 118, legSpread: 0, tilt: -62 },
      { kind: 'front', armL: 61, forearmL: 61, armR: 118, forearmR: 118, legSpread: 0, tilt: -61 },
    ],
    periodMs: 3000,
    hold: true,
    placement: ground('wL', 60),
    howTo: 'On your side, hand (or forearm) under your shoulder, feet stacked. Lift your hips so your body is a straight line. Hold.',
    mistakes: ['Hips dropping toward the floor', 'Body not in a straight line', 'Shoulder not stacked over your hand'],
  },
  'jumping-jacks': {
    frames: [
      { kind: 'front', armL: 12, forearmL: 12, legSpread: 4 },
      { kind: 'front', armL: 168, forearmL: 172, legSpread: 22 },
    ],
    periodMs: 1100,
    placement: ground('hip', 120, 0.9),
    howTo: 'Jump your feet out wide while swinging your arms overhead, then jump back together.',
    mistakes: ['Not bringing your arms all the way overhead', 'Feet not jumping wide enough', 'Landing heavily on your heels'],
  },
  'mountain-climbers': {
    frames: [
      { kind: 'side', torso: 64, thigh: 30, shin: -100, thigh2: -64, shin2: -64, upperArm: 0, forearm: 0 },
      { kind: 'side', torso: 64, thigh: -64, shin: -64, thigh2: 30, shin2: -100, upperArm: 0, forearm: 0 },
    ],
    periodMs: 1000,
    placement: ground('wrist', 190),
    howTo: 'Start in a high plank. Drive one knee toward your chest, then switch legs quickly, keeping your hips low.',
    mistakes: ['Hips rising too high', 'Not driving your knees far enough toward your chest', 'Bouncing your hips up and down'],
  },
  // ---------- Gym ----------
  'barbell-curl': {
    frames: [
      { ...standing, upperArm: 3, forearm: 5, upperArm2: 3, forearm2: 5 },
      { ...standing, upperArm: 5, forearm: 150, upperArm2: 5, forearm2: 150 },
    ],
    periodMs: 2400,
    placement: ground('ankle', 110),
    howTo: 'Hold the bar at arm’s length, elbows at your sides. Curl it up to your shoulders, then lower until your arms are straight.',
    mistakes: ['Swinging your back to lift the weight', 'Letting your elbows drift forward', 'Not straightening your arms at the bottom'],
  },
  'hammer-curl': {
    frames: [
      { ...standing, upperArm: 3, forearm: 5 },
      { ...standing, upperArm: 5, forearm: 145 },
    ],
    periodMs: 2400,
    placement: ground('ankle', 110),
    howTo: 'Palms facing in, elbows at your sides. Curl the dumbbell up toward your shoulder, then lower until your arm is straight.',
    mistakes: ['Swinging your back to lift the weight', 'Letting your elbows drift forward', 'Not straightening your arms at the bottom'],
  },
  'chin-ups': {
    frames: [
      { kind: 'front', armL: 165, forearmL: 170, legSpread: 3 },
      { kind: 'front', armL: 70, forearmL: 165, legSpread: 3 },
    ],
    periodMs: 2600,
    placement: { y: { mode: 'joint', joint: 'wL', y: 18 }, x: { joint: 'hip', x: 120 }, scale: 0.85 },
    props: ['bar'],
    howTo: 'Palms facing you, hands shoulder-width. Pull your chest up until your chin is over the bar, then lower all the way down.',
    mistakes: ['Not going all the way down between reps', 'Chin not getting over the bar', 'Swinging or kicking your legs'],
  },
  'overhead-tricep-extension': {
    frames: [
      { kind: 'side', torso: 0, thigh: 90, shin: 0, upperArm: 172, forearm: 320, upperArm2: 172, forearm2: 320 },
      { kind: 'side', torso: 0, thigh: 90, shin: 0, upperArm: 175, forearm: 182, upperArm2: 175, forearm2: 182 },
    ],
    periodMs: 2600,
    placement: ground('ankle', 120),
    howTo: 'Sit tall, one dumbbell in both hands behind your head, elbows pointing up. Straighten your arms overhead, then lower behind your head.',
    mistakes: ['Letting your elbows drop forward', 'Arching your lower back', 'Not straightening your arms at the top'],
  },
  'rope-pushdown': {
    frames: [
      { kind: 'side', torso: 10, thigh: 0, shin: 0, upperArm: 5, forearm: 95 },
      { kind: 'side', torso: 10, thigh: 0, shin: 0, upperArm: 3, forearm: 3 },
    ],
    periodMs: 2200,
    placement: ground('ankle', 110),
    howTo: 'Elbows pinned to your sides, palms facing in. Push the rope down until your arms are straight, then come back to forearms level.',
    mistakes: ['Letting your elbows move forward', 'Leaning over the rope to push', 'Not straightening your arms at the bottom'],
  },
  'rod-pushdown': {
    frames: [
      { kind: 'side', torso: 10, thigh: 0, shin: 0, upperArm: 5, forearm: 95 },
      { kind: 'side', torso: 10, thigh: 0, shin: 0, upperArm: 3, forearm: 3 },
    ],
    periodMs: 2200,
    placement: ground('ankle', 110),
    howTo: 'Elbows pinned to your sides, palms down on the bar. Push it down until your arms are straight, then come back to forearms level.',
    mistakes: ['Letting your elbows move forward', 'Leaning over the bar to push', 'Not straightening your arms at the bottom'],
  },
  'dumbbell-row': {
    frames: [
      { kind: 'side', torso: 72, thigh: 15, shin: -10, upperArm: 0, forearm: 0, upperArm2: 0, forearm2: 0 },
      { kind: 'side', torso: 72, thigh: 15, shin: -10, upperArm: -70, forearm: 0, upperArm2: 0, forearm2: 0 },
    ],
    periodMs: 2400,
    placement: ground('ankle', 120),
    howTo: 'Bend over with a flat back, arm hanging straight. Pull the dumbbell up to your hip, elbow going past your body, then lower slowly. Switch arms.',
    mistakes: ['Standing up as you pull', 'Rounding your back', 'Not pulling your elbow high enough'],
  },
  'weighted-squat': {
    frames: [
      { ...standing, torso: 5, upperArm: -35, forearm: 165, upperArm2: -35, forearm2: 165 },
      { kind: 'side', torso: 40, thigh: 85, shin: -30, upperArm: 5, forearm: 200, upperArm2: 5, forearm2: 200 },
    ],
    periodMs: 2800,
    placement: ground('ankle', 110),
    howTo: 'Bar resting on your upper back, feet shoulder-width. Sit back and down until your thighs are parallel to the floor, chest up, then stand tall.',
    mistakes: ['Leaning too far forward under the bar', 'Knees caving inward', 'Not going deep enough'],
  },
  'leg-extension': {
    frames: [
      { kind: 'side', torso: -10, thigh: 90, shin: 0, upperArm: 15, forearm: 15 },
      { kind: 'side', torso: -10, thigh: 90, shin: 85, upperArm: 15, forearm: 15 },
    ],
    periodMs: 2400,
    placement: { y: { mode: 'joint', joint: 'hip', y: 120 }, x: { joint: 'hip', x: 100 } },
    howTo: 'Sit back in the machine, pad on your lower shins. Straighten your legs until they are almost locked, then lower slowly.',
    mistakes: ['Lifting your hips off the seat', 'Swinging the weight up', 'Not straightening your legs fully'],
  },
};

import { angleAt, isVisible, leanFromVerticalDeg } from '../geometry';
import { LM } from '../landmarks';
import type { Landmark } from '../types';
import type { Joints } from '../landmarks';
import type { RepDefinition } from './createAnalyzer';
import { hanging, maxOverSides, minOverTrustedSides, onFeet, sideDifference, torsoElevation } from './helpers';

/** Elbow angle (shoulder–elbow–wrist). */
const elbow = (lms: Landmark[], s: Joints, aspect: number) => angleAt(lms[s.shoulder], lms[s.elbow], lms[s.wrist], aspect);
/** Upper arm vs torso (hip–shoulder–elbow): ~0–20° with the elbow at your side. */
const upperArmFromTorso = (lms: Landmark[], j: Joints, aspect: number) =>
  maxOverSides(lms, ['hip', 'shoulder', 'elbow'], (s) => angleAt(lms[s.hip], lms[s.shoulder], lms[s.elbow], aspect), j);

const standTall = {
  message: 'Stand up straight to start',
  isIn: (lms: Landmark[], j: Joints, aspect: number) => torsoElevation(lms, j, aspect) > 55,
};

// ---------- Biceps ----------

/** Barbell curl: both arms together, so no left/right counting. */
export const barbellCurl: RepDefinition = {
  id: 'barbell-curl',
  name: 'Barbell curl',
  category: 'arms',
  cameraView: 'side',
  setupHint: 'Stand side-on to the camera, 2–3 m away, holding the bar at arm’s length, with your upper body and hips in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Elbow angle: ~165° bar down, ~45° bar at the shoulders. Both arms move together: use the arm the camera sees.
  measure: (lms, j, aspect) => elbow(lms, j, aspect),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 60, limit: 45 },
  position: standTall,
  partialMessage: 'Curl all the way up',
  checks: [
    {
      id: 'bbcurl-swing',
      message: "Don't swing your back",
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 15,
    },
    {
      id: 'bbcurl-elbows',
      message: 'Keep your elbows at your sides',
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => upperArmFromTorso(lms, joints, aspect) > 35,
    },
    {
      id: 'bbcurl-swing-strict',
      message: "Don't swing your back",
      phases: ['moving', 'active'],
      minLevel: 5,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 10,
    },
  ],
};

/** Hammer curl: palms facing in; alternate or together, counted per side like the dumbbell curl. */
export const hammerCurl: RepDefinition = {
  id: 'hammer-curl',
  name: 'Hammer curl',
  category: 'arms',
  cameraView: 'side',
  setupHint: 'Stand side-on to the camera, 2–3 m away, dumbbells at your sides with palms facing in, upper body and hips in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  measure: (lms, j, aspect) => minOverTrustedSides(lms, ['shoulder', 'elbow', 'wrist'], (s) => elbow(lms, s, aspect), j),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 65, limit: 45 },
  position: standTall,
  partialMessage: 'Curl all the way up',
  sides: { needs: ['shoulder', 'elbow', 'wrist'], measure: (lms, j, aspect) => elbow(lms, j, aspect) },
  checks: [
    {
      id: 'hammer-swing',
      message: "Don't swing your back",
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 15,
    },
    {
      id: 'hammer-elbows',
      message: 'Keep your elbows at your sides',
      phases: ['moving', 'active'],
      isWrong: ({ lms, joints, aspect }) => upperArmFromTorso(lms, joints, aspect) > 35,
    },
  ],
};

/** Chin-up: palms facing you. Front view, like the pull-up. */
export const chinUps: RepDefinition = {
  id: 'chin-ups',
  name: 'Chin-ups',
  category: 'arms',
  cameraView: 'front',
  setupHint: 'Palms facing you on the bar. Face the camera, 2–3 m back and angled up, so your hands on the bar and your hips are in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist'],
  // Elbow angle: ~170° hanging, ~55° at the top.
  measure: (lms, j, aspect) => elbow(lms, j, aspect),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 130, activeThreshold: 80, limit: 50 },
  position: { message: 'Hang from the bar to start', isIn: (lms, j) => hanging(lms, j) },
  partialMessage: 'Pull higher',
  checks: [
    {
      id: 'chin-chin',
      message: 'Get your chin over the bar',
      phases: ['active'],
      isWrong: ({ lms, joints }) => lms[LM.NOSE].y > lms[joints.wrist].y,
    },
    {
      id: 'chin-even',
      message: 'Pull evenly with both arms',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, aspect }) => sideDifference(lms, ['shoulder', 'elbow', 'wrist'], (s) => elbow(lms, s, aspect)) > 30,
    },
  ],
};

// ---------- Triceps ----------

/** Seated overhead extension: one dumbbell in both hands, behind the head → arms straight up. */
export const overheadTricepExtension: RepDefinition = {
  id: 'overhead-tricep-extension',
  name: 'Overhead tricep extension',
  category: 'arms',
  cameraView: 'side',
  setupHint: 'Sit tall side-on to the camera, 2–3 m away, holding one dumbbell with both hands behind your head. Upper body and hips in view.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Elbow angle: ~50–70° dumbbell behind the head, ~165° arms straight up.
  measure: (lms, j, aspect) => elbow(lms, j, aspect),
  counter: { direction: 'increase', restThreshold: 90, startThreshold: 105, activeThreshold: 150, limit: 172 },
  position: {
    message: 'Sit tall with your elbows pointing up',
    // torso upright and elbows above the shoulders (arms overhead)
    isIn: (lms, j, aspect) => torsoElevation(lms, j, aspect) > 55 && lms[j.elbow].y < lms[j.shoulder].y,
  },
  partialMessage: 'Straighten your arms all the way up',
  checks: [
    {
      id: 'ohte-upper-arm',
      message: 'Keep your elbows pointing up',
      phases: ['moving', 'active'],
      // upper arm should stay close to vertical; it drifts forward when the shoulders do the work
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.shoulder], lms[joints.elbow], aspect) > 30,
    },
    {
      id: 'ohte-arch',
      message: "Don't arch your back",
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 20,
    },
  ],
};

/** Cable pushdown (rope or straight rod): elbows pinned, push down until the arms are straight. */
function pushdown(id: string, name: string, grip: string): RepDefinition {
  return {
    id,
    name,
    category: 'arms',
    cameraView: 'side',
    setupHint: `Stand side-on to the camera at the cable machine, 2–3 m away, ${grip}. Upper body and hips in view.`,
    requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
    // Elbow angle: ~80–90° forearms level, ~165° arms straight down.
    measure: (lms, j, aspect) => elbow(lms, j, aspect),
    counter: { direction: 'increase', restThreshold: 100, startThreshold: 115, activeThreshold: 155, limit: 172 },
    position: {
      message: 'Stand up straight to start',
      isIn: (lms, j, aspect) => onFeet(lms, j, aspect) && torsoElevation(lms, j, aspect) > 50,
    },
    partialMessage: 'Push all the way down',
    checks: [
      {
        id: `${id}-elbows`,
        message: 'Keep your elbows pinned to your sides',
        phases: ['moving', 'active'],
        isWrong: ({ lms, joints, aspect }) => upperArmFromTorso(lms, joints, aspect) > 30,
      },
      {
        id: `${id}-lean`,
        message: 'Stand more upright',
        phases: ['moving', 'active'],
        isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 30,
      },
      {
        id: `${id}-lean-strict`,
        message: 'Stand more upright',
        phases: ['moving', 'active'],
        minLevel: 4,
        isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 20,
      },
    ],
  };
}

export const ropePushdown = pushdown('rope-pushdown', 'Tricep rope pushdown', 'holding the rope with palms facing in');
export const rodPushdown = pushdown('rod-pushdown', 'Tricep rod pushdown', 'holding the straight bar with palms down');

// ---------- Back ----------

/** One-arm dumbbell row, bent over: counted per side ("Left 5 · Right 5"), like curls. */
export const dumbbellRow: RepDefinition = {
  id: 'dumbbell-row',
  name: 'Dumbbell row',
  category: 'back',
  cameraView: 'side',
  setupHint: 'Bend over side-on to the camera (hand or knee on a bench is fine), 2–3 m away, back flat, whole body in view. Row one arm at a time.',
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Elbow angle of the rowing arm: ~165° hanging, ~80° with the elbow pulled up past the body.
  measure: (lms, j, aspect) => minOverTrustedSides(lms, ['shoulder', 'elbow', 'wrist'], (s) => elbow(lms, s, aspect), j),
  counter: { direction: 'decrease', restThreshold: 150, startThreshold: 135, activeThreshold: 95, limit: 65 },
  position: {
    message: 'Bend over with a flat back to start',
    // torso tipped well forward (between flat and about 50° up)
    isIn: (lms, j, aspect) => torsoElevation(lms, j, aspect) < 50,
  },
  partialMessage: 'Pull your elbow higher',
  sides: { needs: ['shoulder', 'elbow', 'wrist'], measure: (lms, j, aspect) => elbow(lms, j, aspect) },
  checks: [
    {
      id: 'row-torso-up',
      message: 'Stay bent over: keep your chest down',
      phases: ['moving', 'active'],
      // standing up during the pull turns it into a shrug/swing
      isWrong: ({ lms, joints, aspect }) => torsoElevation(lms, joints, aspect) > 40,
    },
    {
      id: 'row-torso-up-strict',
      message: 'Stay bent over: keep your chest down',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) => torsoElevation(lms, joints, aspect) > 32,
    },
  ],
};

// ---------- Legs ----------

/** Barbell back squat: same movement as the squat, with the bar on your upper back. */
export const weightedSquat: RepDefinition = {
  id: 'weighted-squat',
  name: 'Weighted squat',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Bar on your upper back. Stand side-on to the camera, 2.5–3 m away, so your whole body and the bar are in view.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Knee angle: ~175° standing, ~90° at parallel.
  measure: (lms, j, aspect) => angleAt(lms[j.hip], lms[j.knee], lms[j.ankle], aspect),
  counter: { direction: 'decrease', restThreshold: 160, startThreshold: 140, activeThreshold: 100, limit: 75 },
  position: {
    message: 'Stand up straight to start',
    isIn: (lms, j, aspect) => onFeet(lms, j, aspect) && torsoElevation(lms, j, aspect) > 25,
  },
  partialMessage: 'Go deeper',
  checks: [
    {
      id: 'wsquat-lean',
      message: 'Keep your chest up',
      phases: ['moving', 'active'],
      minLevel: 1, // safety under load
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 50,
    },
    {
      id: 'wsquat-lean-strict',
      message: 'Keep your chest up',
      phases: ['moving', 'active'],
      minLevel: 4,
      isWrong: ({ lms, joints, aspect }) => leanFromVerticalDeg(lms[joints.hip], lms[joints.shoulder], aspect) > 40,
    },
  ],
};

/** Leg extension machine: seated, straighten the knees, lower slowly. */
export const legExtension: RepDefinition = {
  id: 'leg-extension',
  name: 'Leg extension',
  category: 'legs',
  cameraView: 'side',
  setupHint: 'Sit in the machine side-on to the camera, 2–3 m away, so your hip, knee and ankle are in view.',
  requiredJoints: ['shoulder', 'hip', 'knee', 'ankle'],
  // Knee angle: ~90° legs bent, ~170° legs straight.
  measure: (lms, j, aspect) => angleAt(lms[j.hip], lms[j.knee], lms[j.ankle], aspect),
  counter: { direction: 'increase', restThreshold: 110, startThreshold: 125, activeThreshold: 160, limit: 175 },
  position: {
    message: 'Sit back in the machine to start',
    // seated: torso upright-ish and the hip bent (thigh forward)
    isIn: (lms, j, aspect) =>
      torsoElevation(lms, j, aspect) > 45 && angleAt(lms[j.shoulder], lms[j.hip], lms[j.knee], aspect) < 140,
  },
  partialMessage: 'Straighten your legs all the way',
  checks: [
    {
      id: 'legext-hips',
      message: 'Keep your hips on the seat',
      phases: ['moving', 'active'],
      // hips sliding forward / lifting opens the hip angle
      isWrong: ({ lms, joints, aspect }) =>
        isVisible(lms, [joints.shoulder, joints.hip, joints.knee]) &&
        angleAt(lms[joints.shoulder], lms[joints.hip], lms[joints.knee], aspect) > 135,
    },
  ],
};

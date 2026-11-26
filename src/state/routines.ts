import type { WorkoutPlan } from './workoutSession';
import type { Level } from '../engine/exercises/levels';

/** One exercise inside a routine. plan.mode is always 'plan' (fixed sets). */
export interface RoutineStep {
  exerciseId: string;
  plan: WorkoutPlan;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  steps: RoutineStep[];
  /** rest between two exercises, in seconds */
  restBetweenSec: number;
  /** built-in routines can't be edited or deleted (but can be copied) */
  builtIn?: boolean;
  /** built-in only: the levels this routine is recommended for */
  levels?: [Level, Level];
  /** built-in only: needs gym equipment (weights, machines) or just bodyweight */
  equipment?: 'bodyweight' | 'gym';
}

const reps = (exerciseId: string, sets: number, target: number, restSec = 60): RoutineStep => ({
  exerciseId,
  plan: { mode: 'plan', sets, target, restSec },
});
const hold = (exerciseId: string, sets: number, seconds: number, restSec = 45): RoutineStep => ({
  exerciseId,
  plan: { mode: 'plan', sets, target: seconds, restSec },
});

export const BUILT_IN_ROUTINES: Routine[] = [
  {
    id: 'builtin-leg-day',
    equipment: 'bodyweight',
    levels: [2, 6],
    name: 'Leg day',
    description: 'Squats, lunges and glutes, finished with a wall sit.',
    builtIn: true,
    restBetweenSec: 90,
    steps: [reps('squat', 3, 12), reps('lunge', 3, 10), reps('glute-bridge', 3, 12), hold('wall-sit', 2, 30)],
  },
  {
    id: 'builtin-upper-body',
    equipment: 'gym',
    levels: [2, 6],
    name: 'Upper body',
    description: 'Chest, shoulders and arms.',
    builtIn: true,
    restBetweenSec: 90,
    steps: [
      reps('pushup', 3, 10),
      reps('shoulder-press', 3, 10),
      reps('bicep-curl', 3, 12),
      reps('dips', 2, 8),
      reps('lateral-raise', 3, 12),
    ],
  },
  {
    id: 'builtin-core-blast',
    equipment: 'bodyweight',
    levels: [2, 6],
    name: 'Core blast',
    description: 'Crunches, knee raises and planks.',
    builtIn: true,
    restBetweenSec: 60,
    steps: [
      reps('crunch', 3, 15, 45),
      reps('knee-raise', 3, 10),
      hold('plank', 3, 30),
      hold('side-plank', 2, 20),
      reps('situp', 2, 12, 45),
    ],
  },
  {
    id: 'builtin-full-body-beginner',
    equipment: 'bodyweight',
    levels: [1, 3],
    name: 'Full body (beginner)',
    description: 'A short, easy full-body session.',
    builtIn: true,
    restBetweenSec: 60,
    steps: [
      reps('squat', 2, 10),
      reps('pushup', 2, 8),
      reps('glute-bridge', 2, 12),
      hold('plank', 2, 20),
      reps('jumping-jacks', 2, 20, 45),
    ],
  },
  {
    id: 'builtin-push-gym',
    name: 'Push day (gym)',
    description: 'Shoulders, chest and triceps with dumbbells and cables.',
    builtIn: true,
    equipment: 'gym',
    levels: [2, 6],
    restBetweenSec: 90,
    steps: [
      reps('shoulder-press', 3, 10, 90),
      reps('pushup', 3, 12),
      reps('lateral-raise', 3, 12),
      reps('overhead-tricep-extension', 3, 12),
      reps('rope-pushdown', 3, 12),
    ],
  },
  {
    id: 'builtin-pull-gym',
    name: 'Pull day (gym)',
    description: 'Back and biceps: rows (8 each arm), chin-ups and curls.',
    builtIn: true,
    equipment: 'gym',
    levels: [2, 6],
    restBetweenSec: 90,
    steps: [
      reps('dumbbell-row', 3, 16, 75),
      reps('chin-ups', 3, 6, 90),
      reps('barbell-curl', 3, 10),
      reps('hammer-curl', 3, 12),
    ],
  },
  {
    id: 'builtin-legs-gym',
    name: 'Leg day (gym)',
    description: 'Barbell squats, Romanian deadlifts and the leg extension machine.',
    builtIn: true,
    equipment: 'gym',
    levels: [2, 6],
    restBetweenSec: 120,
    steps: [
      reps('weighted-squat', 4, 8, 120),
      reps('deadlift', 3, 10, 90),
      reps('leg-extension', 3, 12),
      reps('lunge', 3, 10),
      hold('wall-sit', 2, 30),
    ],
  },
  {
    id: 'builtin-arms-gym',
    name: 'Arms day (gym)',
    description: 'Biceps and triceps, back to back.',
    builtIn: true,
    equipment: 'gym',
    levels: [2, 6],
    restBetweenSec: 75,
    steps: [
      reps('barbell-curl', 3, 10),
      reps('rod-pushdown', 3, 12),
      reps('hammer-curl', 3, 12),
      reps('overhead-tricep-extension', 3, 12),
      reps('rope-pushdown', 3, 12),
    ],
  },
];

// ---------- Levels: built-in routines scaled to the user's level ----------

/** How a level changes a built-in routine. Level 3 = the routine as written. */
const LEVEL_SCALE: Record<Level, { sets: number; amount: number; extraRest: number }> = {
  1: { sets: -1, amount: 0.5, extraRest: 30 },
  2: { sets: -1, amount: 0.75, extraRest: 15 },
  3: { sets: 0, amount: 1, extraRest: 0 },
  4: { sets: 0, amount: 1.25, extraRest: 0 },
  5: { sets: 1, amount: 1.25, extraRest: 0 },
  6: { sets: 1, amount: 1.5, extraRest: 15 },
};
const MAX_REST = 300;

/** A built-in routine with sets, reps/seconds and rest adjusted to the level. isHold tells reps from timed holds. */
export function scaleRoutine(routine: Routine, level: Level, isHold: (exerciseId: string) => boolean): Routine {
  const k = LEVEL_SCALE[level];
  return {
    ...routine,
    restBetweenSec: Math.min(MAX_REST, routine.restBetweenSec + k.extraRest),
    steps: routine.steps.map((s) => {
      const hold = isHold(s.exerciseId);
      const amount = s.plan.target * k.amount;
      return {
        ...s,
        plan: {
          ...s.plan,
          // fewer sets for easier levels, but never below 2 if the routine had 2+
          sets: Math.min(10, Math.max(Math.min(2, s.plan.sets), s.plan.sets + k.sets)),
          // holds in 5-second steps (at least 10 s), reps at least 3
          target: hold ? Math.max(10, Math.round(amount / 5) * 5) : Math.max(3, Math.round(amount)),
          restSec: Math.min(MAX_REST, s.plan.restSec + k.extraRest),
        },
      };
    }),
  };
}

/** Is this built-in routine recommended for the level? */
export function suitsLevel(routine: Routine, level: Level): boolean {
  return !routine.levels || (level >= routine.levels[0] && level <= routine.levels[1]);
}

// ---------- Custom routines, saved in the browser ----------

const KEY = 'kinematic.routines.v1';

export function loadCustomRoutines(): Routine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as Routine[]).filter(isValidRoutine) : [];
  } catch {
    return [];
  }
}

export function saveCustomRoutines(routines: Routine[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(routines.filter((r) => !r.builtIn)));
    return true;
  } catch {
    return false;
  }
}

export function isValidRoutine(r: unknown): r is Routine {
  const x = r as Routine;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.restBetweenSec === 'number' &&
    Array.isArray(x.steps) &&
    x.steps.every((s) => s && typeof s.exerciseId === 'string' && s.plan && typeof s.plan.sets === 'number')
  );
}

export function newRoutineId(): string {
  return `routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

import type { WorkoutPlan } from './workoutSession';

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
    name: 'Leg day',
    description: 'Squats, lunges and glutes, finished with a wall sit.',
    builtIn: true,
    restBetweenSec: 90,
    steps: [reps('squat', 3, 12), reps('lunge', 3, 10), reps('glute-bridge', 3, 12), hold('wall-sit', 2, 30)],
  },
  {
    id: 'builtin-upper-body',
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
];

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

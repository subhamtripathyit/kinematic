import type { ExerciseAnalyzer } from '../types';
import {
  createAnalyzerFromDefinition,
  exerciseKind,
  isHold,
  type ExerciseDefinition,
  type HoldDefinition,
  type RepDefinition,
} from './createAnalyzer';
import { CATEGORIES, type Category } from './categories';
// Legs
import { squat } from './squat';
import { lunge } from './lunge';
import { gluteBridge } from './gluteBridge';
import { wallSit } from './wallSit';
// Chest
import { pushup } from './pushup';
import { dips } from './dips';
// Back
import { pullup } from './pullup';
import { deadlift } from './deadlift';
// Shoulders
import { shoulderPress } from './shoulderPress';
import { lateralRaise } from './lateralRaise';
// Arms
import { bicepCurl } from './bicepCurl';
// Core
import { crunch } from './crunch';
import { situp } from './situp';
import { kneeRaise } from './kneeRaise';
import { plank } from './plank';
import { sidePlank } from './sidePlank';
// Full body / cardio
import { jumpingJacks } from './jumpingJacks';
import { mountainClimbers } from './mountainClimbers';

/** All exercises the app offers. To add one: write a definition file and add it here. */
export const EXERCISES: ExerciseDefinition[] = [
  squat, lunge, gluteBridge, wallSit,
  pushup, dips,
  pullup, deadlift,
  shoulderPress, lateralRaise,
  bicepCurl,
  crunch, situp, kneeRaise, plank, sidePlank,
  jumpingJacks, mountainClimbers,
];

export function getExercise(id: string): ExerciseDefinition {
  const def = EXERCISES.find((e) => e.id === id);
  if (!def) throw new Error(`Unknown exercise: ${id}`);
  return def;
}

export function createAnalyzer(id: string): ExerciseAnalyzer {
  return createAnalyzerFromDefinition(getExercise(id));
}

/** Exercises grouped by category, in picker order. Empty categories are left out. */
export function exercisesByCategory(): { id: Category; label: string; exercises: ExerciseDefinition[] }[] {
  return CATEGORIES.map((c) => ({ ...c, exercises: EXERCISES.filter((e) => e.category === c.id) })).filter(
    (c) => c.exercises.length > 0,
  );
}

export { CATEGORIES, exerciseKind, isHold };
export type { Category, ExerciseDefinition, HoldDefinition, RepDefinition };

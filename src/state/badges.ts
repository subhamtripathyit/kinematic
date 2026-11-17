import { EXERCISES } from '../engine/exercises';
import { formScore, type SessionSummary } from './session';
import { longestStreak, trainingDays } from './progress';

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

/** All badges, earned or not, worked out from the saved history. */
export function computeBadges(history: SessionSummary[]): Badge[] {
  const totalReps = history.reduce((sum, h) => sum + h.totals.reps, 0);
  const squats = history.filter((h) => h.exerciseId === 'squat').reduce((sum, h) => sum + h.totals.reps, 0);
  const workoutDays = trainingDays(history).size;
  const streak = longestStreak(history);
  const longPlank = history.some(
    (h) => (h.exerciseId === 'plank' || h.exerciseId === 'side-plank') && h.sets.some((s) => s.stats.holdMs >= 60_000),
  );
  const perfectSet = history.some(
    (h) => h.kind === 'reps' && h.sets.some((s) => s.stats.reps >= 5 && formScore('reps', s.stats) === 100),
  );
  const routineDays = new Set(history.filter((h) => h.routine).map((h) => `${h.routine?.id}|${h.date.slice(0, 10)}`)).size;
  const categoryOf = new Map(EXERCISES.map((e) => [e.id, e.category]));
  const categories = new Set(history.map((h) => categoryOf.get(h.exerciseId)).filter(Boolean));
  const allCategories = new Set(EXERCISES.map((e) => e.category)).size;

  const badge = (id: string, name: string, description: string, earned: boolean): Badge => ({ id, name, description, earned });
  return [
    badge('first-workout', 'First workout', 'Finish your first workout', history.length > 0),
    badge('days-10', 'Regular', 'Work out on 10 different days', workoutDays >= 10),
    badge('days-50', 'Committed', 'Work out on 50 different days', workoutDays >= 50),
    badge('reps-100', '100 reps', 'Do 100 reps in total', totalReps >= 100),
    badge('reps-1000', '1,000 reps', 'Do 1,000 reps in total', totalReps >= 1000),
    badge('squats-100', 'Squat squad', 'Do 100 squats in total', squats >= 100),
    badge('streak-3', 'On a roll', 'Work out 3 days in a row', streak >= 3),
    badge('streak-7', 'Week warrior', 'Work out 7 days in a row', streak >= 7),
    badge('plank-60', 'Iron core', 'Hold a plank for 1 minute in one set', longPlank),
    badge('perfect-set', 'Perfect set', 'A set of 5+ reps with a form score of 100', perfectSet),
    badge('first-routine', 'Routine runner', 'Do a routine', routineDays >= 1),
    badge('all-rounder', 'All-rounder', 'Train every body-part category', categories.size >= allCategories),
  ];
}

/** Badges earned in `after` that weren't earned in `before`. */
export function newlyEarned(before: Badge[], after: Badge[]): Badge[] {
  const had = new Set(before.filter((b) => b.earned).map((b) => b.id));
  return after.filter((b) => b.earned && !had.has(b.id));
}

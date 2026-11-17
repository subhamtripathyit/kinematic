import type { ExerciseKind, ExerciseStats } from '../engine/types';
import type { SetResult, WorkoutPlan } from './workoutSession';

/** One finished exercise workout. Shown on the summary screen and saved to history. */
export interface SessionSummary {
  id: string;
  /** ISO date-time when the workout finished */
  date: string;
  exerciseId: string;
  exerciseName: string;
  kind: ExerciseKind;
  plan: WorkoutPlan;
  durationSec: number;
  sets: SetResult[];
  totals: ExerciseStats;
  /** set when this exercise was done as part of a routine */
  routine?: { id: string; name: string };
}

export function emptyTotals(): ExerciseStats {
  return { reps: 0, goodReps: 0, partialReps: 0, holdMs: 0, positionMs: 0, tutMs: 0, formScores: [], mistakes: {} };
}

/** Adds up several sets. Tolerates old saved data that lacks newer fields. */
export function totalStats(sets: SetResult[]): ExerciseStats {
  const total = emptyTotals();
  for (const { stats } of sets) {
    total.reps += stats.reps;
    total.goodReps += stats.goodReps;
    total.partialReps += stats.partialReps;
    total.holdMs += stats.holdMs;
    total.positionMs += stats.positionMs ?? 0;
    total.tutMs += stats.tutMs ?? 0;
    total.formScores.push(...(stats.formScores ?? []));
    for (const [message, count] of Object.entries(stats.mistakes)) {
      total.mistakes[message] = (total.mistakes[message] ?? 0) + count;
    }
  }
  return total;
}

export function buildSummary(
  exercise: { id: string; name: string; kind: ExerciseKind },
  plan: WorkoutPlan,
  startedAt: number,
  sets: SetResult[],
  routine?: { id: string; name: string },
): SessionSummary {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    kind: exercise.kind,
    plan,
    durationSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    sets,
    totals: totalStats(sets),
    ...(routine ? { routine } : {}),
  };
}

/** Worth saving to history? (skip workouts where nothing happened) */
export function hasProgress(s: ExerciseStats): boolean {
  return s.reps > 0 || s.partialReps > 0 || s.holdMs >= 1000;
}

/**
 * Overall form score 0-100, or null if there's nothing to score.
 * Reps: average of every rep's score. Timed: share of time in position that had good form.
 */
export function formScore(kind: ExerciseKind, s: ExerciseStats): number | null {
  if (kind === 'hold') {
    const position = s.positionMs ?? 0;
    return position >= 1000 ? Math.round(Math.min(1, s.holdMs / position) * 100) : null;
  }
  const scores = s.formScores ?? [];
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

/** Average seconds per rep (tempo), or null. */
export function avgRepSeconds(s: ExerciseStats): number | null {
  const reps = s.reps + s.partialReps;
  const tut = s.tutMs ?? 0;
  return reps > 0 && tut > 0 ? tut / reps / 1000 : null;
}

/** Mistakes sorted from most to least common. */
export function sortedMistakes(stats: ExerciseStats): [string, number][] {
  return Object.entries(stats.mistakes).sort((a, b) => b[1] - a[1]);
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "12 reps" or "0:45 held" for one set or a total. */
export function describeStats(kind: ExerciseKind, s: ExerciseStats): string {
  return kind === 'hold' ? `${formatDuration(s.holdMs / 1000)} held` : `${s.reps} reps`;
}

/** "3 × 10" or "3 × 0:30" or "Free". */
export function describePlan(kind: ExerciseKind, plan: WorkoutPlan): string {
  if (plan.mode === 'free') return 'Free';
  return `${plan.sets} × ${kind === 'hold' ? formatDuration(plan.target) : plan.target}`;
}

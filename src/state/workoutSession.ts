import type { ExerciseKind, ExerciseStats } from '../engine/types';

/**
 * What the user chose on the setup screen.
 * mode 'plan': fixed sets with a target (reps per set, or seconds per set for timed exercises).
 * mode 'free': no target, as many reps / as long as you like; sets/target are ignored.
 */
export interface WorkoutPlan {
  mode: 'plan' | 'free';
  sets: number;
  target: number;
  restSec: number;
}

export interface SetResult {
  setNumber: number;
  stats: ExerciseStats;
}

export type SessionPhase = 'working' | 'resting' | 'done';

export type SessionEvent =
  | { type: 'set-complete'; setNumber: number; isLast: boolean }
  | { type: 'rest-over'; nextSet: number }
  | null;

export function defaultPlan(kind: ExerciseKind): WorkoutPlan {
  return kind === 'hold'
    ? { mode: 'plan', sets: 3, target: 30, restSec: 60 }
    : { mode: 'plan', sets: 3, target: 10, restSec: 60 };
}

const hasProgress = (s: ExerciseStats) => s.reps > 0 || s.partialReps > 0 || s.holdMs >= 1000;

/**
 * Sets + rest timer. Plain TypeScript (no React), so it's easy to test.
 * working --(target reached)--> resting --(timer ends / skip)--> working ... --> done
 */
export class WorkoutSession {
  phase: SessionPhase = 'working';
  currentSet = 1;
  readonly results: SetResult[] = [];
  private restEndsAt = 0;
  private restStartedAt = 0;

  /** Free workout: rest has no end. It counts up until "Start next set". */
  get openRest(): boolean {
    return this.plan.mode === 'free';
  }

  constructor(
    readonly plan: WorkoutPlan,
    readonly kind: ExerciseKind,
  ) {}

  isTargetReached(stats: ExerciseStats): boolean {
    if (this.plan.mode === 'free') return false;
    return this.kind === 'hold' ? stats.holdMs >= this.plan.target * 1000 : stats.reps >= this.plan.target;
  }

  /** Call every frame while working, with the live stats of the current set. */
  updateWorking(stats: ExerciseStats, now: number): SessionEvent {
    if (this.phase !== 'working' || !this.isTargetReached(stats)) return null;
    return this.completeSet(stats, now);
  }

  /** Ends the current set (target reached, or user pressed "Finish set"). */
  completeSet(stats: ExerciseStats, now: number): SessionEvent {
    if (this.phase !== 'working') return null;
    const setNumber = this.currentSet;
    this.results.push({ setNumber, stats });
    const isLast = this.plan.mode === 'plan' && setNumber >= this.plan.sets;
    if (isLast) {
      this.phase = 'done';
    } else if (this.openRest) {
      // free workout: rest as long as you like, the clock counts up
      this.phase = 'resting';
      this.restStartedAt = now;
      this.restEndsAt = Infinity;
    } else if (this.plan.restSec > 0) {
      this.phase = 'resting';
      this.restEndsAt = now + this.plan.restSec * 1000;
    } else {
      // No rest: go straight into the next set (phase stays 'working').
      this.currentSet++;
    }
    return { type: 'set-complete', setNumber, isLast };
  }

  restRemainingSec(now: number): number {
    if (this.phase !== 'resting' || this.openRest) return 0;
    return Math.max(0, Math.ceil((this.restEndsAt - now) / 1000));
  }

  /** Seconds rested so far (free workout's count-up clock). */
  restElapsedSec(now: number): number {
    return this.phase === 'resting' ? Math.max(0, Math.floor((now - this.restStartedAt) / 1000)) : 0;
  }

  /** Call every frame while resting. */
  updateResting(now: number): SessionEvent {
    if (this.phase !== 'resting' || now < this.restEndsAt) return null;
    return this.startNextSet();
  }

  /** Lengthen (+) or shorten (-) the rest in progress. Never past maxSec in total remaining. */
  adjustRest(deltaSec: number, now: number, maxSec = 600): void {
    if (this.phase !== 'resting' || this.openRest) return;
    const remaining = Math.max(0, this.restEndsAt - now) + deltaSec * 1000;
    this.restEndsAt = now + Math.min(Math.max(remaining, 0), maxSec * 1000);
  }

  skipRest(): SessionEvent {
    return this.phase === 'resting' ? this.startNextSet() : null;
  }

  /** User pressed "End workout": keep the current set if anything was done in it. */
  finishEarly(stats: ExerciseStats): void {
    if (this.phase === 'working' && hasProgress(stats)) {
      this.results.push({ setNumber: this.currentSet, stats });
    }
    this.phase = 'done';
  }

  private startNextSet(): SessionEvent {
    this.currentSet++;
    this.phase = 'working';
    return { type: 'rest-over', nextSet: this.currentSet };
  }
}

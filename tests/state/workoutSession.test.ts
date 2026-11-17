import { describe, expect, it } from 'vitest';
import { WorkoutSession } from '../../src/state/workoutSession';
import { totalStats } from '../../src/state/session';

const stats = (reps: number, holdMs = 0) => ({
  reps,
  goodReps: reps,
  partialReps: 0,
  holdMs,
  positionMs: holdMs,
  tutMs: 0,
  formScores: [],
  mistakes: {},
});

describe('WorkoutSession', () => {
  it('goes set -> rest -> set -> done', () => {
    const s = new WorkoutSession({ mode: 'plan', sets: 2, target: 3, restSec: 10 }, 'reps');
    expect(s.updateWorking(stats(2), 0)).toBeNull();
    expect(s.updateWorking(stats(3), 100)).toEqual({ type: 'set-complete', setNumber: 1, isLast: false });
    expect(s.phase).toBe('resting');
    expect(s.restRemainingSec(5100)).toBe(5);
    expect(s.updateResting(9000)).toBeNull();
    expect(s.updateResting(10100)).toEqual({ type: 'rest-over', nextSet: 2 });
    expect(s.updateWorking(stats(3), 11000)).toEqual({ type: 'set-complete', setNumber: 2, isLast: true });
    expect(s.phase).toBe('done');
    expect(s.results.map((r) => r.stats.reps)).toEqual([3, 3]);
  });

  it('uses seconds as the target for timed exercises', () => {
    const s = new WorkoutSession({ mode: 'plan', sets: 1, target: 30, restSec: 0 }, 'hold');
    expect(s.updateWorking(stats(0, 29_000), 0)).toBeNull();
    expect(s.updateWorking(stats(0, 30_000), 0)?.type).toBe('set-complete');
  });

  it('can skip rest and end early', () => {
    const s = new WorkoutSession({ mode: 'plan', sets: 3, target: 5, restSec: 60 }, 'reps');
    s.completeSet(stats(4), 0);
    expect(s.skipRest()).toEqual({ type: 'rest-over', nextSet: 2 });
    s.finishEarly(stats(2));
    expect(s.phase).toBe('done');
    expect(s.results).toHaveLength(2);
    expect(totalStats(s.results).reps).toBe(6);
  });

  it('does not save an empty set when ending early', () => {
    const s = new WorkoutSession({ mode: 'plan', sets: 3, target: 5, restSec: 60 }, 'reps');
    s.finishEarly(stats(0));
    expect(s.results).toHaveLength(0);
  });

  it('free mode never ends on its own and moves straight to the next set', () => {
    const s = new WorkoutSession({ mode: 'free', sets: 3, target: 10, restSec: 0 }, 'reps');
    expect(s.updateWorking(stats(50), 0)).toBeNull();
    expect(s.completeSet(stats(50), 0)).toEqual({ type: 'set-complete', setNumber: 1, isLast: false });
    expect(s.phase).toBe('working');
    expect(s.currentSet).toBe(2);
    s.completeSet(stats(20), 0);
    s.completeSet(stats(5), 0);
    s.completeSet(stats(5), 0);
    expect(s.phase).toBe('working');
    s.finishEarly(stats(0));
    expect(s.results.map((r) => r.stats.reps)).toEqual([50, 20, 5, 5]);
  });

  it('plan mode with no rest also goes straight to the next set', () => {
    const s = new WorkoutSession({ mode: 'plan', sets: 2, target: 3, restSec: 0 }, 'reps');
    s.updateWorking(stats(3), 0);
    expect(s.phase).toBe('working');
    expect(s.currentSet).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { currentStreak, dayKey, heatmap, longestStreak, workoutsThisWeek } from '../../src/state/progress';
import { computeBadges, newlyEarned } from '../../src/state/badges';
import type { SessionSummary } from '../../src/state/session';

const day = (y: number, m: number, d: number, extra: Partial<SessionSummary> = {}): SessionSummary => ({
  id: `${y}-${m}-${d}-${Math.random()}`,
  date: new Date(y, m - 1, d, 18, 0).toISOString(),
  exerciseId: 'squat',
  exerciseName: 'Squat',
  kind: 'reps',
  plan: { mode: 'free', sets: 1, target: 10, restSec: 0 },
  durationSec: 60,
  sets: [{ setNumber: 1, stats: { reps: 10, goodReps: 10, partialReps: 0, holdMs: 0, positionMs: 0, tutMs: 0, formScores: [], mistakes: {} } }],
  totals: { reps: 10, goodReps: 10, partialReps: 0, holdMs: 0, positionMs: 0, tutMs: 0, formScores: [], mistakes: {} },
  ...extra,
});

const today = new Date(2026, 10, 18); // Wed 18 Nov 2026

describe('streaks', () => {
  it('counts days in a row up to today or yesterday', () => {
    const h = [day(2026, 11, 15), day(2026, 11, 16), day(2026, 11, 17)];
    expect(currentStreak(h, today)).toBe(3); // today not done yet, streak still alive
    expect(currentStreak([...h, day(2026, 11, 18)], today)).toBe(4);
    expect(currentStreak([day(2026, 11, 10)], today)).toBe(0);
  });

  it('finds the longest streak', () => {
    expect(longestStreak([day(2026, 10, 1), day(2026, 10, 2), day(2026, 10, 3), day(2026, 10, 10)])).toBe(3);
  });

  it('counts workout days this week (Mon-Sun)', () => {
    const h = [day(2026, 11, 15), day(2026, 11, 16), day(2026, 11, 17), day(2026, 11, 17)];
    expect(workoutsThisWeek(h, today)).toBe(2); // 15th was last week's Sunday
  });

  it('builds a 12-week heatmap ending this week', () => {
    const cols = heatmap([day(2026, 11, 17)], 12, today);
    expect(cols).toHaveLength(12);
    expect(cols[11][1]).toMatchObject({ date: dayKey(new Date(2026, 10, 17)), count: 1 });
    expect(cols[11][6].future).toBe(true);
  });
});

describe('badges', () => {
  it('unlocks badges as you go', () => {
    const before = computeBadges([]);
    const after = computeBadges([day(2026, 11, 16), day(2026, 11, 17), day(2026, 11, 18)]);
    const ids = newlyEarned(before, after).map((b) => b.id);
    expect(ids).toContain('first-workout');
    expect(ids).toContain('streak-3');
    expect(ids).not.toContain('reps-100');
  });
});

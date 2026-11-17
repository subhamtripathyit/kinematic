import { describe, expect, it } from 'vitest';
import {
  addEntry,
  bmi,
  estimatedGoalDate,
  formatWeight,
  goalProgress,
  mergeBody,
  paceCheck,
  suggestedTargetDate,
  trendSeries,
  weeklyPace,
  type BodyData,
  type BodyGoal,
} from '../../src/state/body';

const lose: BodyGoal = { type: 'lose', startWeightKg: 120, goalWeightKg: 80, startDate: '2026-09-01' };
const gain: BodyGoal = { type: 'gain', startWeightKg: 60, goalWeightKg: 70, startDate: '2026-09-01' };

describe('goal progress', () => {
  it('works for weight loss (120 -> 80, now 108)', () => {
    const p = goalProgress(lose, 108);
    expect(p.change).toBe(-12);
    expect(p.remaining).toBe(28);
    expect(p.fraction).toBeCloseTo(0.3);
    expect(p.reached).toBe(false);
  });

  it('works for weight gain and is never negative', () => {
    expect(goalProgress(gain, 65).fraction).toBeCloseTo(0.5);
    expect(goalProgress(gain, 58).fraction).toBe(0);
    expect(goalProgress(gain, 71).reached).toBe(true);
  });

  it('counts maintain as on target within 1.5 kg', () => {
    const m: BodyGoal = { type: 'maintain', startWeightKg: 75, goalWeightKg: 75, startDate: '2026-09-01' };
    expect(goalProgress(m, 76).reached).toBe(true);
    expect(goalProgress(m, 78).reached).toBe(false);
  });
});

describe('pace and estimate', () => {
  const data: BodyData = ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'].reduce(
    (d, date, i) => addEntry(d, date, 110 - i), // -1 kg per week
    { unit: 'kg', goal: lose, entries: [] } as BodyData,
  );

  it('fits a straight line through recent weigh-ins', () => {
    expect(weeklyPace(data.entries, '2026-10-22')).toBeCloseTo(-1, 5);
  });

  it('needs at least 3 weigh-ins over a week', () => {
    expect(weeklyPace(data.entries.slice(0, 2), '2026-10-22')).toBeNull();
  });

  it('estimates the goal date from the pace (27 kg left at 1 kg/week)', () => {
    const eta = estimatedGoalDate(lose, 107, -1, '2026-10-22');
    expect(eta?.toISOString().slice(0, 10)).toBe(new Date(2027, 3, 29).toISOString().slice(0, 10));
  });

  it('gives no estimate when moving away from the goal', () => {
    expect(estimatedGoalDate(lose, 107, +0.5, '2026-10-22')).toBeNull();
  });

  it('smooths daily noise with a 7-day average', () => {
    const noisy = [100, 102, 99, 101].reduce((d, w, i) => addEntry(d, `2026-11-0${i + 1}`, w), { unit: 'kg', goal: null, entries: [] } as BodyData);
    expect(trendSeries(noisy.entries).at(-1)?.weightKg).toBeCloseTo(100.5);
  });

  it('replaces an entry logged twice on the same day', () => {
    const d = addEntry(addEntry(data, '2026-10-22', 200), '2026-10-22', 107);
    expect(d.entries.filter((e) => e.date === '2026-10-22')).toHaveLength(1);
    expect(d.entries.at(-1)?.weightKg).toBe(107);
  });
});

describe('healthy pace check', () => {
  it('flags 120 -> 80 kg in two months as too fast and suggests a later date', () => {
    const c = paceCheck('lose', 120, 80, '2027-01-17', '2026-11-17');
    expect(c?.tooFast).toBe(true);
    expect(c?.safePerWeek).toBe(1);
    expect(c && c.suggestedDate && c.suggestedDate > '2027-08-01').toBe(true);
  });

  it('accepts a sensible pace', () => {
    expect(paceCheck('lose', 90, 85, '2027-01-17', '2026-11-17')?.tooFast).toBe(false);
  });

  it('suggests ~ a year for 40 kg (0.75 kg/week -> 54 weeks)', () => {
    expect(suggestedTargetDate('lose', 120, 80, '2026-11-17')).toBe('2027-11-30');
  });
});

describe('units, BMI, backup merge', () => {
  it('formats in kg or lb', () => {
    expect(formatWeight(80, 'kg')).toBe('80.0 kg');
    expect(formatWeight(80, 'lb')).toBe('176.4 lb');
  });

  it('computes BMI', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.7, 1);
    expect(bmi(80, undefined)).toBeNull();
  });

  it('merges a backup without duplicating days', () => {
    const local: BodyData = { unit: 'kg', goal: lose, entries: [{ id: 'a', date: '2026-10-01', weightKg: 110 }] };
    const incoming: BodyData = {
      unit: 'lb',
      goal: gain,
      entries: [
        { id: 'b', date: '2026-10-01', weightKg: 999 },
        { id: 'c', date: '2026-10-08', weightKg: 109 },
      ],
    };
    const { data, added } = mergeBody(local, incoming);
    expect(added).toBe(1);
    expect(data.goal).toBe(lose); // local goal wins
    expect(data.entries.map((e) => e.weightKg)).toEqual([110, 109]);
  });
});

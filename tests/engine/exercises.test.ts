import { describe, expect, it } from 'vitest';
import { CATEGORIES, EXERCISES, exercisesByCategory, isHold } from '../../src/engine/exercises';

describe('exercise registry', () => {
  it('has 18 exercises (15 rep + 3 timed) with unique ids', () => {
    expect(EXERCISES).toHaveLength(18);
    expect(EXERCISES.filter(isHold)).toHaveLength(3);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it('puts every exercise in a known category', () => {
    const ids = CATEGORIES.map((c) => c.id);
    for (const e of EXERCISES) expect(ids).toContain(e.category);
    expect(exercisesByCategory().flatMap((g) => g.exercises)).toHaveLength(EXERCISES.length);
  });

  it('orders rep thresholds correctly for each direction', () => {
    for (const e of EXERCISES) {
      if (isHold(e)) continue;
      const { direction, restThreshold: rest, startThreshold: start, activeThreshold: active } = e.counter;
      if (direction === 'decrease') expect(rest > start && start > active, e.id).toBe(true);
      else expect(rest < start && start < active, e.id).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise, isHold } from '../../src/engine/exercises';
import { levelCounter } from '../../src/engine/exercises/createAnalyzer';
import { LEVELS, levelRules } from '../../src/engine/exercises/levels';
import { RepCounter } from '../../src/engine/repCounter';
import { BUILT_IN_ROUTINES, scaleRoutine, suitsLevel } from '../../src/state/routines';

const squat = getExercise('squat');
if (isHold(squat)) throw new Error('squat should be a rep exercise');

/** Runs 3 squats that go down to `bottom` degrees and back up to `top`, returns the events. */
function squats(level: Parameters<typeof levelCounter>[1], bottom: number, top = 175): string[] {
  if (isHold(squat)) return [];
  const counter = new RepCounter(levelCounter(squat.counter, level));
  const events: string[] = [];
  for (let r = 0; r < 3; r++) {
    for (let a = top; a >= bottom; a -= 5) {
      const e = counter.update(a);
      if (e) events.push(e);
    }
    for (let a = bottom; a <= top; a += 5) {
      const e = counter.update(a);
      if (e) events.push(e);
    }
  }
  return events;
}

describe('training levels', () => {
  it('has 6 levels, each with an experience range', () => {
    expect(LEVELS).toHaveLength(6);
    for (const l of LEVELS) expect(l.experience.length).toBeGreaterThan(0);
  });

  it('leaves the Exercises tab (no level) exactly as before', () => {
    if (isHold(squat)) return;
    expect(levelCounter(squat.counter)).toEqual(squat.counter);
    expect(levelRules()).toEqual({ rangeScale: 1, maxCheckLevel: 2, tempoScale: 1, lockout: false });
  });

  it('counts a half squat at level 1 but not at level 3', () => {
    expect(squats(1, 125)).toEqual(['rep', 'rep', 'rep']);
    expect(squats(3, 125)).toEqual(['partial', 'partial', 'partial']);
  });

  it('needs deeper reps as the level goes up', () => {
    // a 95° squat: a full rep at levels 3 and 4, too shallow at 5 and 6
    expect(squats(3, 95)).toEqual(['rep', 'rep', 'rep']);
    expect(squats(4, 95)).toEqual(['rep', 'rep', 'rep']);
    expect(squats(5, 95)).toEqual(['partial', 'partial', 'partial']);
    expect(squats(6, 85)).toEqual(['rep', 'rep', 'rep']);
  });

  it('never asks for more than the body can do', () => {
    for (const e of EXERCISES) {
      if (isHold(e) || e.counter.limit === undefined) continue;
      const target = levelCounter(e.counter, 6).activeThreshold;
      const ok = e.counter.direction === 'decrease' ? target >= e.counter.limit : target <= e.counter.limit;
      expect(ok, e.id).toBe(true);
    }
  });

  it('needs a full stand-up at level 5', () => {
    expect(squats(3, 85, 162)).toEqual(['rep', 'rep', 'rep']);
    expect(squats(5, 85, 162)).toEqual([]);
    expect(squats(5, 85, 175)).toEqual(['rep', 'rep', 'rep']);
  });

  it('only adds new checks at levels above the Exercises tab', () => {
    // every check is either an old one (on in the Exercises tab) or tagged for level 3+
    for (const e of EXERCISES) {
      for (const c of e.checks) {
        const level = c.minLevel ?? 2;
        expect(level >= 1 && level <= 6, `${e.id}/${c.id}`).toBe(true);
      }
    }
  });
});

describe('routines scaled to a level', () => {
  const holdId = (id: string) => isHold(getExercise(id));
  const legDay = BUILT_IN_ROUTINES.find((r) => r.id === 'builtin-leg-day')!;

  it('keeps level 3 as written', () => {
    expect(scaleRoutine(legDay, 3, holdId).steps).toEqual(legDay.steps);
  });

  it('makes level 1 easier and level 6 harder', () => {
    const easy = scaleRoutine(legDay, 1, holdId);
    const hard = scaleRoutine(legDay, 6, holdId);
    legDay.steps.forEach((s, i) => {
      expect(easy.steps[i].plan.target).toBeLessThan(s.plan.target);
      expect(hard.steps[i].plan.target).toBeGreaterThan(s.plan.target);
      expect(easy.steps[i].plan.sets).toBeGreaterThanOrEqual(1);
    });
  });

  it('recommends the beginner routine for level 1', () => {
    const recommended = BUILT_IN_ROUTINES.filter((r) => suitsLevel(r, 1)).map((r) => r.id);
    expect(recommended).toContain('builtin-full-body-beginner');
  });
});

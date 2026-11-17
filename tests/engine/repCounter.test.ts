import { describe, expect, it } from 'vitest';
import { RepCounter, type RepCounterConfig } from '../../src/engine/repCounter';

function run(cfg: RepCounterConfig, values: number[]) {
  const counter = new RepCounter(cfg);
  return values.map((v) => counter.update(v)).filter(Boolean);
}

const squat: RepCounterConfig = { direction: 'decrease', restThreshold: 160, startThreshold: 140, activeThreshold: 100 };
const crunch: RepCounterConfig = { direction: 'increase', restThreshold: 12, startThreshold: 18, activeThreshold: 30 };

describe('RepCounter', () => {
  it('counts a full squat', () => {
    expect(run(squat, [175, 150, 120, 90, 120, 150, 170])).toEqual(['rep']);
  });

  it('counts three squats in a row', () => {
    const one = [175, 130, 90, 130, 170];
    expect(run(squat, [...one, ...one, ...one])).toEqual(['rep', 'rep', 'rep']);
  });

  it('flags a shallow squat as partial', () => {
    expect(run(squat, [175, 130, 115, 130, 170])).toEqual(['partial']);
  });

  it('ignores small wobbles while standing', () => {
    expect(run(squat, [175, 158, 165, 150, 170, 145, 172])).toEqual([]);
  });

  it('works for exercises where the value goes up (crunch)', () => {
    expect(run(crunch, [3, 20, 35, 20, 5])).toEqual(['rep']);
  });
});

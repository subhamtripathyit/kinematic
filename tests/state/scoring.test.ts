import { beforeEach, describe, expect, it } from 'vitest';
import { scoreRep } from '../../src/engine/exercises/createAnalyzer';
import { formScore, totalStats } from '../../src/state/session';
import { exportBackup, importBackup, loadHistory, saveSession } from '../../src/state/history';
import type { SessionSummary } from '../../src/state/session';

describe('form score', () => {
  it('scores reps', () => {
    expect(scoreRep(true, 0, false, 1)).toBe(100);
    expect(scoreRep(true, 1, false, 1)).toBe(75);
    expect(scoreRep(true, 0, true, 1)).toBe(80);
    expect(scoreRep(true, 5, true, 1)).toBe(0);
    expect(scoreRep(false, 0, false, 0.5)).toBe(20);
  });

  it('averages reps and uses time-in-good-form for holds', () => {
    const base = { reps: 2, goodReps: 1, partialReps: 0, holdMs: 0, positionMs: 0, tutMs: 0, mistakes: {} };
    expect(formScore('reps', { ...base, formScores: [100, 60] })).toBe(80);
    expect(formScore('hold', { ...base, formScores: [], holdMs: 45_000, positionMs: 60_000 })).toBe(75);
    expect(formScore('reps', { ...base, formScores: [] })).toBeNull();
  });

  it('handles history saved before form scores existed', () => {
    const old = { reps: 5, goodReps: 5, partialReps: 0, holdMs: 0, mistakes: {} } as never;
    const t = totalStats([{ setNumber: 1, stats: old }]);
    expect(t.reps).toBe(5);
    expect(t.formScores).toEqual([]);
    expect(t.tutMs).toBe(0);
  });
});

describe('backup', () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });

  const session = (id: string): SessionSummary => ({
    id,
    date: new Date().toISOString(),
    exerciseId: 'squat',
    exerciseName: 'Squat',
    kind: 'reps',
    plan: { mode: 'free', sets: 3, target: 10, restSec: 0 },
    durationSec: 60,
    sets: [],
    totals: { reps: 0, goodReps: 0, partialReps: 0, holdMs: 0, positionMs: 0, tutMs: 0, formScores: [], mistakes: {} },
  });

  it('round-trips and skips duplicates', () => {
    saveSession(session('a'));
    const text = exportBackup();
    expect(importBackup(text).sessionsAdded).toBe(0);
    localStorage.removeItem('kinematic.history.v1');
    expect(importBackup(text).sessionsAdded).toBe(1);
    expect(loadHistory()).toHaveLength(1);
  });

  it('rejects files that are not backups', () => {
    expect(() => importBackup('hello')).toThrow();
    expect(() => importBackup('{"foo":1}')).toThrow();
  });
});

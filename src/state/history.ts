import type { ExerciseKind } from '../engine/types';
import { formScore, type SessionSummary } from './session';
import { isValidRoutine, loadCustomRoutines, saveCustomRoutines, type Routine } from './routines';

/**
 * Workout history, saved in the browser (localStorage) on this laptop only.
 * No backend needed. Survives refreshes and restarts; cleared if the user clears site data.
 */
const KEY = 'kinematic.history.v1';
const MAX_SESSIONS = 1000;

export function loadHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as SessionSummary[]).filter(isValidSession) : [];
  } catch {
    return [];
  }
}

function writeHistory(all: SessionSummary[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX_SESSIONS)));
    return true;
  } catch {
    return false;
  }
}

/** Newest first. Returns false if the browser refused (e.g. storage full or blocked). */
export function saveSession(session: SessionSummary): boolean {
  return writeHistory([session, ...loadHistory()]);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

function isValidSession(s: unknown): s is SessionSummary {
  const x = s as SessionSummary;
  return !!x && typeof x.id === 'string' && typeof x.exerciseId === 'string' && Array.isArray(x.sets) && !!x.totals;
}

export interface PersonalBest {
  exerciseId: string;
  exerciseName: string;
  kind: ExerciseKind;
  /** best single set: reps, or hold milliseconds */
  best: number;
  date: string;
}

/** Best single set so far for one exercise: reps, or hold time in ms. 0 if never done. */
export function bestSetValue(history: SessionSummary[], exerciseId: string): number {
  let best = 0;
  for (const h of history) {
    if (h.exerciseId !== exerciseId) continue;
    for (const s of h.sets) best = Math.max(best, h.kind === 'hold' ? s.stats.holdMs : s.stats.reps);
  }
  return best;
}

/** Best single set per exercise. */
export function personalBests(history: SessionSummary[]): PersonalBest[] {
  const bests = new Map<string, PersonalBest>();
  for (const session of history) {
    for (const set of session.sets) {
      const value = session.kind === 'hold' ? set.stats.holdMs : set.stats.reps;
      const current = bests.get(session.exerciseId);
      if (!current || value > current.best) {
        bests.set(session.exerciseId, {
          exerciseId: session.exerciseId,
          exerciseName: session.exerciseName,
          kind: session.kind,
          best: value,
          date: session.date,
        });
      }
    }
  }
  return [...bests.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

// ---------- Backup: export / import ----------

interface Backup {
  app: 'kinematic';
  version: 1;
  exportedAt: string;
  history: SessionSummary[];
  routines: Routine[];
}

/** Full backup (history + your routines) as JSON text. Can be imported again. */
export function exportBackup(): string {
  const backup: Backup = {
    app: 'kinematic',
    version: 1,
    exportedAt: new Date().toISOString(),
    history: loadHistory(),
    routines: loadCustomRoutines(),
  };
  return JSON.stringify(backup, null, 2);
}

/** Restores a backup. Merges with what's already here: nothing is deleted, duplicates are skipped. */
export function importBackup(text: string): { sessionsAdded: number; routinesAdded: number } {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(text) as Partial<Backup>;
  } catch {
    throw new Error("That file isn't valid JSON. Pick a Kinematic backup file (.json).");
  }
  if (data.app !== 'kinematic' || !Array.isArray(data.history)) {
    throw new Error("That file isn't a Kinematic backup.");
  }

  const current = loadHistory();
  const known = new Set(current.map((s) => s.id));
  const incoming = data.history.filter((s) => isValidSession(s) && !known.has(s.id));
  const merged = [...current, ...incoming].sort((a, b) => b.date.localeCompare(a.date));
  if (!writeHistory(merged)) throw new Error('Could not save: browser storage is full or blocked.');

  const routines = loadCustomRoutines();
  const knownRoutines = new Set(routines.map((r) => r.id));
  const newRoutines = (Array.isArray(data.routines) ? data.routines : []).filter(
    (r) => isValidRoutine(r) && !r.builtIn && !knownRoutines.has(r.id),
  );
  if (newRoutines.length) saveCustomRoutines([...routines, ...newRoutines]);

  return { sessionsAdded: incoming.length, routinesAdded: newRoutines.length };
}

/** One row per set, for Excel / Google Sheets. */
export function exportCsv(history: SessionSummary[]): string {
  const header = ['date', 'exercise', 'routine', 'set', 'reps', 'good_form_reps', 'partial_reps', 'held_seconds', 'form_score', 'time_under_tension_seconds'];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [header.join(',')];
  for (const h of [...history].reverse()) {
    for (const set of h.sets) {
      rows.push(
        [
          h.date,
          h.exerciseName,
          h.routine?.name ?? '',
          set.setNumber,
          set.stats.reps,
          set.stats.goodReps,
          set.stats.partialReps,
          Math.round(set.stats.holdMs / 1000),
          formScore(h.kind, set.stats) ?? '',
          Math.round((set.stats.tutMs ?? 0) / 1000),
        ]
          .map(esc)
          .join(','),
      );
    }
  }
  return rows.join('\n');
}

import type { SessionSummary } from './session';

/** "2026-11-17" in the user's local time zone. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** day -> number of exercise sessions that day */
export function trainingDays(history: SessionSummary[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const h of history) {
    const key = dayKey(new Date(h.date));
    days.set(key, (days.get(key) ?? 0) + 1);
  }
  return days;
}

/** Days in a row with at least one workout, ending today (or yesterday, if today isn't done yet). */
export function currentStreak(history: SessionSummary[], today = new Date()): number {
  const days = trainingDays(history);
  let d = new Date(today);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function longestStreak(history: SessionSummary[]): number {
  const keys = [...trainingDays(history).keys()].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    if (prev) {
      const [y, m, d] = prev.split('-').map(Number);
      run = dayKey(addDays(new Date(y, m - 1, d), 1)) === k ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/** Monday of the week containing d. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -offset);
}

/** Number of different days trained this week (Monday to Sunday). */
export function workoutsThisWeek(history: SessionSummary[], today = new Date()): number {
  const days = trainingDays(history);
  const monday = startOfWeek(today);
  let n = 0;
  for (let i = 0; i < 7; i++) if (days.has(dayKey(addDays(monday, i)))) n++;
  return n;
}

export interface HeatCell {
  date: string;
  count: number;
  future: boolean;
}

/** Columns = weeks (oldest first), rows = Monday..Sunday. */
export function heatmap(history: SessionSummary[], weeks = 12, today = new Date()): HeatCell[][] {
  const days = trainingDays(history);
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1));
  const todayKey = dayKey(today);
  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstMonday, w * 7 + d);
      const key = dayKey(date);
      col.push({ date: key, count: days.get(key) ?? 0, future: key > todayKey });
    }
    columns.push(col);
  }
  return columns;
}

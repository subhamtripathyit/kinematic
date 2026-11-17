import { dayKey } from './progress';

/**
 * Body weight tracking: a goal (lose / gain / maintain) plus weight entries.
 * Everything is stored in kg; the unit only changes how numbers are shown.
 * Saved in the browser (no login needed).
 */
export type WeightUnit = 'kg' | 'lb';
export type GoalType = 'lose' | 'gain' | 'maintain';

export interface BodyGoal {
  type: GoalType;
  startWeightKg: number;
  goalWeightKg: number;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, optional */
  targetDate?: string;
  heightCm?: number;
}

export interface WeightEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  weightKg: number;
}

export interface BodyData {
  unit: WeightUnit;
  goal: BodyGoal | null;
  entries: WeightEntry[];
}

const KEY = 'kinematic.body.v1';
const DAY_MS = 86_400_000;
export const LB_PER_KG = 2.2046226218;
export const MIN_KG = 25;
export const MAX_KG = 350;

// ---------- units ----------

export const toDisplay = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg * LB_PER_KG);
export const fromDisplay = (value: number, unit: WeightUnit) => (unit === 'kg' ? value : value / LB_PER_KG);
export const formatWeight = (kg: number, unit: WeightUnit, digits = 1) => `${toDisplay(kg, unit).toFixed(digits)} ${unit}`;
/** "+1.2 kg" / "−3.4 kg" */
export const formatChange = (kg: number, unit: WeightUnit) => {
  const v = toDisplay(kg, unit);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} ${unit}`;
};

// ---------- dates ----------

export const todayKey = () => dayKey(new Date());
/** Local-midnight Date for a YYYY-MM-DD key. */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY_MS);

// ---------- storage ----------

const EMPTY: BodyData = { unit: 'kg', goal: null, entries: [] };

export function loadBody(): BodyData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, entries: [] };
    const d = JSON.parse(raw) as Partial<BodyData>;
    return {
      unit: d.unit === 'lb' ? 'lb' : 'kg',
      goal: d.goal && typeof d.goal.startWeightKg === 'number' && typeof d.goal.goalWeightKg === 'number' ? d.goal : null,
      entries: Array.isArray(d.entries)
        ? d.entries.filter((e) => e && typeof e.date === 'string' && typeof e.weightKg === 'number')
        : [],
    };
  } catch {
    return { ...EMPTY, entries: [] };
  }
}

export function saveBody(data: BodyData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Merge a backup into what's here: keep the local goal if there is one; add entries for dates we don't have. */
export function mergeBody(local: BodyData, incoming: Partial<BodyData> | undefined): { data: BodyData; added: number } {
  if (!incoming || !Array.isArray(incoming.entries)) return { data: local, added: 0 };
  const have = new Set(local.entries.map((e) => e.date));
  const add = incoming.entries.filter((e) => e && typeof e.weightKg === 'number' && typeof e.date === 'string' && !have.has(e.date));
  return {
    data: {
      unit: local.goal ? local.unit : incoming.unit === 'lb' ? 'lb' : local.unit,
      goal: local.goal ?? incoming.goal ?? null,
      entries: sortEntries([...local.entries, ...add]),
    },
    added: add.length,
  };
}

// ---------- entries ----------

export const sortEntries = (entries: WeightEntry[]) => [...entries].sort((a, b) => a.date.localeCompare(b.date));

/** Add a weigh-in. A second entry on the same day replaces the first (that's how you fix a typo). */
export function addEntry(data: BodyData, date: string, weightKg: number): BodyData {
  const others = data.entries.filter((e) => e.date !== date);
  const entry: WeightEntry = { id: `${date}-${Math.random().toString(36).slice(2, 7)}`, date, weightKg };
  return { ...data, entries: sortEntries([...others, entry]) };
}

export function removeEntry(data: BodyData, id: string): BodyData {
  return { ...data, entries: data.entries.filter((e) => e.id !== id) };
}

/** Latest logged weight, or the starting weight if nothing logged yet. */
export function currentWeight(data: BodyData): number | null {
  const sorted = sortEntries(data.entries);
  return sorted.length ? sorted[sorted.length - 1].weightKg : (data.goal?.startWeightKg ?? null);
}

export function daysSinceLastWeighIn(data: BodyData, today = todayKey()): number | null {
  const sorted = sortEntries(data.entries);
  return sorted.length ? daysBetween(sorted[sorted.length - 1].date, today) : null;
}

/**
 * 7-day average for every entry. Daily weight jumps 1-2 kg from water and food;
 * the average shows the real direction.
 */
export function trendSeries(entries: WeightEntry[]): { date: string; weightKg: number }[] {
  const sorted = sortEntries(entries);
  return sorted.map((e) => {
    const window = sorted.filter((x) => {
      const gap = daysBetween(x.date, e.date);
      return gap >= 0 && gap < 7;
    });
    return { date: e.date, weightKg: window.reduce((s, x) => s + x.weightKg, 0) / window.length };
  });
}

/**
 * Average change per week (kg), from a straight-line fit over the last 8 weeks.
 * Needs at least 3 weigh-ins spread over a week or more; otherwise null.
 */
export function weeklyPace(entries: WeightEntry[], today = todayKey()): number | null {
  const recent = sortEntries(entries).filter((e) => {
    const age = daysBetween(e.date, today);
    return age >= 0 && age <= 56;
  });
  if (recent.length < 3) return null;
  const xs = recent.map((e) => daysBetween(recent[0].date, e.date));
  if (xs[xs.length - 1] < 7) return null;
  const ys = recent.map((e) => e.weightKg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : (num / den) * 7;
}

// ---------- goal progress ----------

export interface GoalProgress {
  /** current - start (negative = lost weight) */
  change: number;
  /** how far is left to the goal (always >= 0) */
  remaining: number;
  /** 0..1, or null for "maintain" */
  fraction: number | null;
  reached: boolean;
}

/** Within this many kg of the target counts as "on target" for maintain goals. */
export const MAINTAIN_BAND_KG = 1.5;

export function goalProgress(goal: BodyGoal, currentKg: number): GoalProgress {
  const change = currentKg - goal.startWeightKg;
  if (goal.type === 'maintain') {
    const off = Math.abs(currentKg - goal.goalWeightKg);
    return { change, remaining: Math.max(0, off - MAINTAIN_BAND_KG), fraction: null, reached: off <= MAINTAIN_BAND_KG };
  }
  const total = Math.abs(goal.goalWeightKg - goal.startWeightKg);
  const done = goal.type === 'lose' ? goal.startWeightKg - currentKg : currentKg - goal.startWeightKg;
  const remaining = Math.max(0, total - done);
  return { change, remaining, fraction: total === 0 ? 1 : Math.min(1, Math.max(0, done / total)), reached: remaining === 0 };
}

/** When you'll reach the goal at your current pace, or null if you're not moving toward it. */
export function estimatedGoalDate(goal: BodyGoal, currentKg: number, pacePerWeek: number | null, today = todayKey()): Date | null {
  if (pacePerWeek === null || goal.type === 'maintain') return null;
  const remaining = goal.type === 'lose' ? currentKg - goal.goalWeightKg : goal.goalWeightKg - currentKg;
  if (remaining <= 0) return null;
  const towardGoal = goal.type === 'lose' ? -pacePerWeek : pacePerWeek;
  if (towardGoal < 0.05) return null;
  const weeks = remaining / towardGoal;
  if (weeks > 260) return null; // more than 5 years: not a useful estimate
  return new Date(parseDay(today).getTime() + weeks * 7 * DAY_MS);
}

// ---------- healthy pace ----------

/** Fastest pace we'd call healthy, kg per week. Lose: 1% of body weight, max 1 kg. Gain: 0.5 kg. */
export function safeWeeklyRate(type: GoalType, weightKg: number): number {
  if (type === 'lose') return Math.min(1, weightKg * 0.01);
  if (type === 'gain') return 0.5;
  return 0;
}

/** A realistic (comfortable, not maximum) pace, used to suggest a target date. */
function comfortableRate(type: GoalType, weightKg: number): number {
  return type === 'lose' ? Math.min(0.75, weightKg * 0.0075) : 0.3;
}

export function suggestedTargetDate(type: GoalType, fromKg: number, goalKg: number, from = todayKey()): string | null {
  if (type === 'maintain') return null;
  const delta = Math.abs(goalKg - fromKg);
  if (delta === 0) return null;
  const weeks = Math.ceil(delta / comfortableRate(type, fromKg));
  return dayKey(new Date(parseDay(from).getTime() + weeks * 7 * DAY_MS));
}

export interface PaceCheck {
  requiredPerWeek: number;
  safePerWeek: number;
  tooFast: boolean;
  suggestedDate: string | null;
}

/** Is the chosen target date realistic? */
export function paceCheck(type: GoalType, fromKg: number, goalKg: number, targetDate: string, today = todayKey()): PaceCheck | null {
  if (type === 'maintain') return null;
  const weeks = daysBetween(today, targetDate) / 7;
  const delta = Math.abs(goalKg - fromKg);
  const safe = safeWeeklyRate(type, fromKg);
  const suggestedDate = suggestedTargetDate(type, fromKg, goalKg, today);
  if (weeks <= 0) return { requiredPerWeek: Infinity, safePerWeek: safe, tooFast: true, suggestedDate };
  const required = delta / weeks;
  return { requiredPerWeek: required, safePerWeek: safe, tooFast: required > safe, suggestedDate };
}

// ---------- BMI ----------

export function bmi(weightKg: number, heightCm: number | undefined): number | null {
  if (!heightCm || heightCm < 100 || heightCm > 250) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obese';
}

/**
 * Training levels (used by routines). The level changes how strict the counting is:
 * how much of the range a rep needs, which form warnings are on, and the tempo check.
 * No level (the Exercises tab) behaves exactly as before levels existed.
 */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

/** experience = how long you've trained consistently (about 3+ times a week). A guide, not a rule. */
export const LEVELS: { id: Level; name: string; experience: string; effect: string }[] = [
  { id: 1, name: 'Absolute beginner', experience: 'New, or under 1 month', effect: 'Half reps count. Only safety warnings.' },
  { id: 2, name: 'Beginner', experience: '1–3 months', effect: 'Most of the range needed. Main form warnings.' },
  { id: 3, name: 'Novice', experience: '3–6 months', effect: 'Full range. All form warnings.' },
  { id: 4, name: 'Intermediate', experience: '6 months – 1 year', effect: 'Deeper reps, stricter form and a slower tempo.' },
  { id: 5, name: 'Advanced', experience: '1–3 years', effect: 'Even deeper reps and strict form. Finish every rep fully.' },
  { id: 6, name: 'Athlete', experience: '3+ years', effect: 'Deepest reps, strictest form and tempo.' },
];

export function levelInfo(level: Level) {
  return LEVELS[level - 1];
}

export function isLevel(v: unknown): v is Level {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6;
}

export interface LevelRules {
  /** Share of the normal range a rep needs to count (0.35 = about a half rep, 1.3 = 30% deeper than normal). */
  rangeScale: number;
  /** Form checks with minLevel up to this are on. 1 = safety only. */
  maxCheckLevel: number;
  /** Multiplier on the "Slow down" time. 0 = no tempo check. */
  tempoScale: number;
  /** Must return fully to the start position (stand all the way up, arms fully straight). */
  lockout: boolean;
}

/** What each level changes. undefined = no level (Exercises tab): same as before levels existed. */
export function levelRules(level?: Level): LevelRules {
  switch (level) {
    case 1:
      return { rangeScale: 0.35, maxCheckLevel: 1, tempoScale: 0, lockout: false };
    case 2:
      return { rangeScale: 0.7, maxCheckLevel: 2, tempoScale: 1, lockout: false };
    case 3:
      return { rangeScale: 1, maxCheckLevel: 3, tempoScale: 1, lockout: false };
    case 4:
      return { rangeScale: 1.1, maxCheckLevel: 4, tempoScale: 1.25, lockout: false };
    case 5:
      return { rangeScale: 1.2, maxCheckLevel: 5, tempoScale: 1.25, lockout: true };
    case 6:
      return { rangeScale: 1.3, maxCheckLevel: 6, tempoScale: 1.5, lockout: true };
    default:
      return { rangeScale: 1, maxCheckLevel: 2, tempoScale: 1, lockout: false };
  }
}

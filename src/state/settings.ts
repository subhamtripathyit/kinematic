import type { CameraFacing } from '../engine/camera';
import type { Lang } from '../i18n';
import { isLevel, type Level } from '../engine/exercises/levels';
import type { WorkoutPlan } from './workoutSession';

export type StartMode = 'countdown' | 'position';
export const COUNTDOWN_OPTIONS = [3, 5, 10];

/** User preferences, saved in the browser. */
export interface Settings {
  voiceEnabled: boolean;
  /** front (selfie) or back camera */
  camera: CameraFacing;
  /** workout days per week to aim for (1-7) */
  weeklyGoal: number;
  /** how a set starts: a 3-2-1 countdown, or automatically once you're in position */
  startMode: StartMode;
  /** countdown length in seconds */
  countdownSec: number;
  /** app + voice language */
  language: Lang;
  /** training level for routines (1–6); undefined until the user picks one */
  routineLevel?: Level;
  /** last plan used per exercise, so setup remembers "3 x 10, 60s rest" */
  plans: Record<string, WorkoutPlan>;
}

const KEY = 'kinematic.settings.v1';
const DEFAULTS: Settings = {
  voiceEnabled: true,
  camera: 'user',
  weeklyGoal: 3,
  startMode: 'countdown',
  countdownSec: 3,
  language: 'en',
  plans: {},
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const data = JSON.parse(raw) as Partial<Settings>;
    return {
      voiceEnabled: typeof data.voiceEnabled === 'boolean' ? data.voiceEnabled : DEFAULTS.voiceEnabled,
      camera: data.camera === 'environment' ? 'environment' : 'user',
      weeklyGoal:
        typeof data.weeklyGoal === 'number' && data.weeklyGoal >= 1 && data.weeklyGoal <= 7
          ? Math.round(data.weeklyGoal)
          : DEFAULTS.weeklyGoal,
      startMode: data.startMode === 'position' ? 'position' : 'countdown',
      language: data.language === 'hi' ? 'hi' : 'en',
      countdownSec: COUNTDOWN_OPTIONS.includes(data.countdownSec as number) ? (data.countdownSec as number) : DEFAULTS.countdownSec,
      routineLevel: isLevel(data.routineLevel) ? data.routineLevel : undefined,
      plans: data.plans && typeof data.plans === 'object' ? data.plans : {},
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage blocked: settings just won't persist
  }
}

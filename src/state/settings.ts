import type { CameraFacing } from '../engine/camera';
import type { WorkoutPlan } from './workoutSession';

/** User preferences, saved in the browser. */
export interface Settings {
  voiceEnabled: boolean;
  /** front (selfie) or back camera */
  camera: CameraFacing;
  /** workout days per week to aim for (1-7) */
  weeklyGoal: number;
  /** last plan used per exercise, so setup remembers "3 x 10, 60s rest" */
  plans: Record<string, WorkoutPlan>;
}

const KEY = 'kinematic.settings.v1';
const DEFAULTS: Settings = { voiceEnabled: true, camera: 'user', weeklyGoal: 3, plans: {} };

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

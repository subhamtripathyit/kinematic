import type { Category } from './categories';

/**
 * Gym exercises shown in the picker as "Coming soon" (not playable yet).
 * When one is built, add its definition to index.ts and remove it from here.
 */
export const COMING_SOON: { name: string; category: Category }[] = [
  // Chest
  { name: 'Flat dumbbell bench press', category: 'chest' },
  { name: 'Incline dumbbell bench press', category: 'chest' },
  { name: 'Flat barbell bench press', category: 'chest' },
  { name: 'Incline barbell bench press', category: 'chest' },
  { name: 'Flat dumbbell chest fly', category: 'chest' },
  { name: 'Incline dumbbell chest fly', category: 'chest' },
  { name: 'Cable fly', category: 'chest' },
  // Back
  { name: 'Lat pulldown', category: 'back' },
  // Arms: biceps
  { name: 'Preacher curl', category: 'arms' },
  // Arms: triceps
  { name: 'Skull crusher', category: 'arms' },
  // Legs
  { name: 'Leg curl', category: 'legs' },
  { name: 'Calf raises', category: 'legs' },
];

/** Playable exercises that use weights (dumbbells / barbell): listed under "Gym". */
export const GYM_EXERCISE_IDS = new Set([
  'bicep-curl', 'shoulder-press', 'lateral-raise', 'deadlift',
  'weighted-squat', 'leg-extension', 'dumbbell-row', 'barbell-curl', 'hammer-curl', 'chin-ups',
  'overhead-tricep-extension', 'rope-pushdown', 'rod-pushdown',
]);

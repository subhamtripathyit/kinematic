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
  { name: 'Dumbbell row', category: 'back' },
  { name: 'Lat pulldown', category: 'back' },
  // Arms: biceps
  { name: 'Barbell curl', category: 'arms' },
  { name: 'Hammer curl', category: 'arms' },
  { name: 'Preacher curl', category: 'arms' },
  { name: 'Chin-ups', category: 'arms' },
  // Arms: triceps
  { name: 'Overhead tricep extension', category: 'arms' },
  { name: 'Tricep rope pushdown', category: 'arms' },
  { name: 'Tricep rod pushdown', category: 'arms' },
  { name: 'Skull crusher', category: 'arms' },
  // Legs
  { name: 'Weighted squat', category: 'legs' },
  { name: 'Leg extension', category: 'legs' },
  { name: 'Leg curl', category: 'legs' },
  { name: 'Calf raises', category: 'legs' },
];

/** Playable exercises that use weights (dumbbells / barbell): listed under "Gym". */
export const GYM_EXERCISE_IDS = new Set(['bicep-curl', 'shoulder-press', 'lateral-raise', 'deadlift']);

export type Category = 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'cardio';

/** Order here = order shown in the picker. */
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'legs', label: 'Legs' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
  { id: 'cardio', label: 'Full body / Cardio' },
];

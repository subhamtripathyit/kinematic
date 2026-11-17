import type { RepPhase } from './repCounter';
import type { Side } from './landmarks';

/** One body point from the pose model. x and y are 0..1 (fraction of the video frame). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Everything the pose engine found in one video frame. */
export interface PoseFrame {
  landmarks: Landmark[];
  timestamp: number;
  /** video width / height, needed to get correct angles */
  aspect: number;
}

export type FeedbackLevel = 'good' | 'warn' | 'info';

export interface Feedback {
  id: string;
  message: string;
  level: FeedbackLevel;
}

export type CameraView = 'side' | 'front';

/** 'reps' = counted exercises (squat), 'hold' = timed exercises (plank). */
export type ExerciseKind = 'reps' | 'hold';

export interface ExerciseStats {
  reps: number;
  goodReps: number;
  partialReps: number;
  /** time held with good form, for timed exercises */
  holdMs: number;
  /** timed exercises: time in position, good or bad form (form score = holdMs / positionMs) */
  positionMs: number;
  /** time under tension: total time spent doing reps */
  tutMs: number;
  /** form score 0-100 for every rep (full and partial), rep exercises only */
  formScores: number[];
  /** mistake message -> how many times it happened */
  mistakes: Record<string, number>;
}

/** Extra numbers for the developer debug panel. */
export interface AnalyzerDebug {
  phase: RepPhase;
  /** which side of the body is being measured */
  side: Side;
  /** furthest the tracked angle has gone in the rep in progress */
  currentRepPeak: number | null;
  /** furthest the tracked angle went in the last finished (or partial) rep */
  lastRepPeak: number | null;
}

export interface AnalyzerResult {
  stats: ExerciseStats;
  feedback: Feedback | null;
  inFrame: boolean;
  /** the main angle/value this exercise tracks */
  value: number | null;
  /** timed exercises: is the timer running right now */
  holding: boolean;
  /** score of the last finished rep (rep exercises) or live form score (timed) */
  lastRepScore: number | null;
  /** how long the last rep took, in ms */
  lastRepMs: number | null;
  debug: AnalyzerDebug;
}

/** Every exercise implements this. The UI only talks to this interface. */
export interface ExerciseAnalyzer {
  readonly id: string;
  readonly name: string;
  readonly kind: ExerciseKind;
  readonly cameraView: CameraView;
  readonly setupHint: string;
  update(frame: PoseFrame | null): AnalyzerResult;
  reset(): void;
}

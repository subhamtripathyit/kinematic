import type {
  AnalyzerResult,
  CameraView,
  ExerciseAnalyzer,
  ExerciseKind,
  ExerciseStats,
  Feedback,
  Landmark,
} from '../types';
import { FeedbackGate } from '../feedback';
import { Smoother, isVisible, pickSide } from '../geometry';
import { sideJoints, type Joints, type Side } from '../landmarks';
import { RepCounter, type RepCounterConfig, type RepPhase } from '../repCounter';
import type { Category } from './categories';

// ---------- Definitions: what makes each exercise different ----------

export interface FrameContext {
  lms: Landmark[];
  joints: Joints;
  aspect: number;
  value: number;
  phase: RepPhase;
}

/** One form rule for a rep exercise, e.g. "Keep your chest up". */
export interface FormCheck {
  id: string;
  message: string;
  /** Only checked during these phases of the rep. */
  phases: RepPhase[];
  isWrong: (ctx: FrameContext) => boolean;
}

export interface HoldContext {
  lms: Landmark[];
  joints: Joints;
  aspect: number;
  value: number;
}

/** One form rule for a timed exercise, e.g. "Lift your hips". The timer pauses while it fails. */
export interface HoldCheck {
  id: string;
  message: string;
  isWrong: (ctx: HoldContext) => boolean;
}

interface BaseDefinition {
  id: string;
  name: string;
  /** Body-part group shown in the picker. */
  category: Category;
  cameraView: CameraView;
  setupHint: string;
  /** Joints that must be visible before we analyze anything. */
  requiredJoints: (keyof Joints)[];
  /** The main value we track (usually a joint angle). */
  measure: (lms: Landmark[], joints: Joints, aspect: number) => number;
}

/** Counted exercise (squat, push-up...). */
export interface RepDefinition extends BaseDefinition {
  kind?: 'reps';
  counter: RepCounterConfig;
  /** Shown when a rep doesn't reach full range, e.g. "Go deeper". */
  partialMessage: string;
  checks: FormCheck[];
  /** Reps faster than this get "Slow down". Default 1000 ms. 0 = no tempo check (jumping jacks). */
  minRepMs?: number;
}

/** Timed exercise (plank, wall sit...). */
export interface HoldDefinition extends BaseDefinition {
  kind: 'hold';
  /** Plain-words rule shown in the debug panel. */
  positionRule: string;
  /** Shown when the user isn't in the position yet, e.g. "Get into plank position". */
  positionMessage: string;
  inPosition: (ctx: HoldContext) => boolean;
  checks: HoldCheck[];
}

export type ExerciseDefinition = RepDefinition | HoldDefinition;

export function isHold(def: ExerciseDefinition): def is HoldDefinition {
  return def.kind === 'hold';
}

export function exerciseKind(def: ExerciseDefinition): ExerciseKind {
  return isHold(def) ? 'hold' : 'reps';
}

// ---------- Shared bits ----------

const GOOD_REP: Feedback = { id: 'good-rep', message: 'Good rep!', level: 'good' };
const TOO_FAST: Feedback = { id: 'too-fast', message: 'Slow down', level: 'warn' };
const HOLDING: Feedback = { id: 'holding', message: 'Hold it, looking good', level: 'good' };
const OUT_OF_FRAME: Feedback = {
  id: 'out-of-frame',
  message: 'Step back so your whole body is visible',
  level: 'info',
};

export function emptyStats(): ExerciseStats {
  return { reps: 0, goodReps: 0, partialReps: 0, holdMs: 0, positionMs: 0, tutMs: 0, formScores: [], mistakes: {} };
}

const copyStats = (s: ExerciseStats): ExerciseStats => ({
  ...s,
  formScores: [...s.formScores],
  mistakes: { ...s.mistakes },
});

/**
 * Form score for one rep, 0-100.
 * Full rep: 100, minus 25 per form mistake, minus 20 if rushed.
 * Partial rep: up to 40, depending on how much of the range was reached.
 */
export function scoreRep(full: boolean, formMistakes: number, tooFast: boolean, rangeFraction: number): number {
  if (!full) return Math.round(40 * Math.min(1, Math.max(0, rangeFraction)));
  return Math.max(0, 100 - 25 * formMistakes - (tooFast ? 20 : 0));
}

/** Turns an exercise definition into a working analyzer. */
export function createAnalyzerFromDefinition(def: ExerciseDefinition): ExerciseAnalyzer {
  return isHold(def) ? createHoldAnalyzer(def) : createRepAnalyzer(def);
}

// ---------- Rep exercises ----------

function createRepAnalyzer(def: RepDefinition): ExerciseAnalyzer {
  const counter = new RepCounter(def.counter);
  const smoother = new Smoother(0.5);
  const gate = new FeedbackGate();
  const repErrors = new Set<string>();
  let stats = emptyStats();
  let side: Side = 'left';
  let currentPeak: number | null = null;
  let lastPeak: number | null = null;
  let repStartTs: number | null = null;
  let lastRepScore: number | null = null;
  let lastRepMs: number | null = null;
  const minRepMs = def.minRepMs ?? 1000;
  /** How much of the range (start -> full) a peak reached, 0..1. */
  const rangeFraction = (peak: number) => {
    const { startThreshold: start, activeThreshold: active } = def.counter;
    return (start - peak) / (start - active);
  };
  const moreActive = (a: number, b: number) =>
    def.counter.direction === 'decrease' ? Math.min(a, b) : Math.max(a, b);

  const addMistake = (message: string) => {
    stats.mistakes[message] = (stats.mistakes[message] ?? 0) + 1;
  };

  const result = (feedback: Feedback | null, inFrame: boolean, value: number | null): AnalyzerResult => ({
    stats: copyStats(stats),
    feedback,
    inFrame,
    value,
    holding: false,
    lastRepScore,
    lastRepMs,
    debug: { phase: counter.phase, side, currentRepPeak: currentPeak, lastRepPeak: lastPeak },
  });

  return {
    id: def.id,
    name: def.name,
    kind: 'reps',
    cameraView: def.cameraView,
    setupHint: def.setupHint,

    update(frame) {
      const now = frame?.timestamp ?? performance.now();
      if (!frame) return result(gate.update(OUT_OF_FRAME, now), false, null);

      const lms = frame.landmarks;
      // Only switch body side between reps, so the angle doesn't jump mid-rep.
      if (counter.phase === 'rest') side = pickSide(lms);
      const joints = sideJoints(side);

      if (!isVisible(lms, def.requiredJoints.map((j) => joints[j]))) {
        return result(gate.update(OUT_OF_FRAME, now), false, null);
      }

      const value = smoother.next(def.measure(lms, joints, frame.aspect));
      const previousPhase = counter.phase;
      const event = counter.update(value);
      if (previousPhase === 'rest' && counter.phase !== 'rest') repStartTs = now;

      if (!event && counter.phase !== 'rest') {
        currentPeak = currentPeak === null ? value : moreActive(currentPeak, value);
      }

      if (event) {
        const peak = currentPeak ?? value;
        lastPeak = peak;
        currentPeak = null;
        const duration = repStartTs === null ? 0 : now - repStartTs;
        repStartTs = null;
        lastRepMs = duration;
        stats.tutMs += duration;

        if (event === 'rep') {
          stats.reps++;
          const formMistakes = repErrors.size;
          const tooFast = minRepMs > 0 && duration < minRepMs;
          if (tooFast) repErrors.add(TOO_FAST.message);
          lastRepScore = scoreRep(true, formMistakes, tooFast, 1);
          if (repErrors.size === 0) {
            stats.goodReps++;
            gate.immediate(GOOD_REP, now);
          } else {
            repErrors.forEach(addMistake);
            if (tooFast) gate.immediate(TOO_FAST, now);
          }
        } else {
          stats.partialReps++;
          addMistake(def.partialMessage);
          gate.immediate({ id: 'partial', message: def.partialMessage, level: 'warn' }, now);
          lastRepScore = scoreRep(false, 0, false, rangeFraction(peak));
        }
        stats.formScores.push(lastRepScore);
        repErrors.clear();
      }

      const ctx: FrameContext = { lms, joints, aspect: frame.aspect, value, phase: counter.phase };
      const failed = def.checks.find((c) => c.phases.includes(counter.phase) && c.isWrong(ctx));
      const shown = gate.update(
        failed ? { id: failed.id, message: failed.message, level: 'warn' } : null,
        now,
      );
      // A mistake only counts against the rep once it was actually shown (lasted several frames).
      if (failed && shown?.id === failed.id) repErrors.add(failed.message);

      return result(shown, true, value);
    },

    reset() {
      counter.reset();
      smoother.reset();
      gate.reset();
      repErrors.clear();
      stats = emptyStats();
      currentPeak = null;
      lastPeak = null;
      repStartTs = null;
      lastRepScore = null;
      lastRepMs = null;
    },
  };
}

// ---------- Timed (hold) exercises ----------

function createHoldAnalyzer(def: HoldDefinition): ExerciseAnalyzer {
  const smoother = new Smoother(0.5);
  const gate = new FeedbackGate();
  const notInPosition: Feedback = { id: 'not-in-position', message: def.positionMessage, level: 'info' };
  let stats = emptyStats();
  let side: Side = 'left';
  let lastTs: number | null = null;
  let wasHolding = false;
  let wasInPosition = false;
  let shownId: string | null = null;

  /** Show feedback; count a mistake each time a new warning appears. */
  const show = (candidate: Feedback | null, now: number) => {
    const shown = gate.update(candidate, now);
    if (shown && shown.level === 'warn' && shown.id !== shownId) {
      stats.mistakes[shown.message] = (stats.mistakes[shown.message] ?? 0) + 1;
    }
    shownId = shown?.id ?? null;
    return shown;
  };

  const result = (feedback: Feedback | null, inFrame: boolean, value: number | null, holding: boolean): AnalyzerResult => ({
    stats: copyStats(stats),
    feedback,
    inFrame,
    value,
    holding,
    lastRepScore: stats.positionMs >= 1000 ? Math.round(Math.min(1, stats.holdMs / stats.positionMs) * 100) : null,
    lastRepMs: null,
    debug: { phase: holding ? 'active' : 'rest', side, currentRepPeak: null, lastRepPeak: null },
  });

  return {
    id: def.id,
    name: def.name,
    kind: 'hold',
    cameraView: def.cameraView,
    setupHint: def.setupHint,

    update(frame) {
      const now = frame?.timestamp ?? performance.now();
      // Time since the last frame, capped so a frozen tab doesn't add a big jump.
      const dt = lastTs === null ? 0 : Math.min(250, Math.max(0, now - lastTs));
      lastTs = now;

      if (!frame) {
        wasHolding = false;
        wasInPosition = false;
        return result(show(OUT_OF_FRAME, now), false, null, false);
      }

      const lms = frame.landmarks;
      if (!wasHolding) side = pickSide(lms);
      const joints = sideJoints(side);

      if (!isVisible(lms, def.requiredJoints.map((j) => joints[j]))) {
        wasHolding = false;
        wasInPosition = false;
        return result(show(OUT_OF_FRAME, now), false, null, false);
      }

      const value = smoother.next(def.measure(lms, joints, frame.aspect));
      const ctx: HoldContext = { lms, joints, aspect: frame.aspect, value };

      if (!def.inPosition(ctx)) {
        wasHolding = false;
        wasInPosition = false;
        return result(show(notInPosition, now), true, value, false);
      }
      if (wasInPosition) stats.positionMs += dt;
      wasInPosition = true;

      const failed = def.checks.find((c) => c.isWrong(ctx));
      const holding = !failed;
      // Timer only runs while the position AND form are good.
      if (holding && wasHolding) stats.holdMs += dt;
      wasHolding = holding;

      const shown = show(failed ? { id: failed.id, message: failed.message, level: 'warn' } : HOLDING, now);
      return result(shown, true, value, holding);
    },

    reset() {
      smoother.reset();
      gate.reset();
      stats = emptyStats();
      lastTs = null;
      wasHolding = false;
      wasInPosition = false;
      shownId = null;
    },
  };
}

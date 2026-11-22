export type RepEvent = 'rep' | 'partial' | null;

/** rest = start position, moving = going toward the hard part, active = full range reached */
export type RepPhase = 'rest' | 'moving' | 'active';

export interface RepCounterConfig {
  /** Does the tracked value go down ('decrease') or up ('increase') as you do the rep? */
  direction: 'decrease' | 'increase';
  /** Back at the start position once the value is back past this. */
  restThreshold: number;
  /** A rep has started once the value moves past this. */
  startThreshold: number;
  /** Full range of motion reached once the value moves past this. */
  activeThreshold: number;
  /**
   * The deepest the body (and camera) can realistically go, e.g. 75° knee angle in a squat.
   * Higher training levels ask for more range than activeThreshold, but never past this.
   */
  limit?: number;
  /**
   * Frames the value must stay past activeThreshold before the rep counts as full depth.
   * 2+ stops a single glitchy frame from turning a half rep into a full one. Default 1.
   */
  confirmFrames?: number;
}

/**
 * Generic rep counter used by every exercise.
 * rest -> moving -> active -> rest = 1 rep
 * rest -> moving -> rest (never reached active) = partial rep ("go deeper")
 * The gap between thresholds stops jitter from counting double reps.
 */
export class RepCounter {
  phase: RepPhase = 'rest';
  private activeStreak = 0;

  constructor(private readonly cfg: RepCounterConfig) {}

  /** true if value is further toward the "active" end than threshold */
  private past(value: number, threshold: number): boolean {
    return this.cfg.direction === 'decrease' ? value < threshold : value > threshold;
  }

  update(value: number): RepEvent {
    const { restThreshold, startThreshold, activeThreshold } = this.cfg;

    if (this.past(value, activeThreshold)) {
      this.activeStreak++;
      if (this.activeStreak >= (this.cfg.confirmFrames ?? 1)) {
        this.phase = 'active';
        return null;
      }
    } else {
      this.activeStreak = 0;
    }
    if (this.phase === 'rest') {
      if (this.past(value, startThreshold)) this.phase = 'moving';
      return null;
    }
    if (!this.past(value, restThreshold)) {
      const event: RepEvent = this.phase === 'active' ? 'rep' : 'partial';
      this.phase = 'rest';
      return event;
    }
    return null;
  }

  reset(): void {
    this.phase = 'rest';
    this.activeStreak = 0;
  }
}

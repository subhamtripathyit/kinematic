import type { Feedback } from './types';

/**
 * Keeps on-screen feedback steady:
 * - an error must last `persistFrames` frames before it shows (no flicker from one bad frame)
 * - a message stays at least `minShowMs` so you can read it
 */
export class FeedbackGate {
  private current: Feedback | null = null;
  private shownAt = 0;
  private candidateId: string | null = null;
  private candidateFrames = 0;

  constructor(
    private readonly persistFrames = 5,
    private readonly minShowMs = 1500,
  ) {}

  /** Show right away (used for events like "Good rep!"). */
  immediate(feedback: Feedback, now: number): void {
    this.current = feedback;
    this.shownAt = now;
    this.candidateId = null;
    this.candidateFrames = 0;
  }

  update(candidate: Feedback | null, now: number): Feedback | null {
    // A warning may replace a "good"/"info" message straight away; otherwise wait minShowMs.
    const canReplace =
      !this.current ||
      now - this.shownAt >= this.minShowMs ||
      (candidate?.level === 'warn' && this.current.level !== 'warn');

    if (!candidate) {
      this.candidateId = null;
      this.candidateFrames = 0;
      if (this.current && canReplace) this.current = null;
      return this.current;
    }

    if (candidate.id === this.candidateId) this.candidateFrames++;
    else {
      this.candidateId = candidate.id;
      this.candidateFrames = 1;
    }

    if (this.current?.id === candidate.id) {
      this.shownAt = now;
      return this.current;
    }
    if (this.candidateFrames >= this.persistFrames && canReplace) {
      this.current = candidate;
      this.shownAt = now;
    }
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.shownAt = 0;
    this.candidateId = null;
    this.candidateFrames = 0;
  }
}

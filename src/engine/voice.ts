/**
 * Voice coach: speaks rep counts and tips using the browser's built-in speech.
 * Nothing to install; works in Chrome and Edge.
 */
export class VoiceCoach {
  private enabled: boolean;
  private readonly lastSpoken = new Map<string, number>();
  private readonly synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  get supported(): boolean {
    return this.synth !== null;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.synth?.cancel();
  }

  /**
   * interrupt: cut off whatever is being said (rep counts, countdowns must be on time).
   * cooldownMs: don't repeat the same phrase within this time (tips like "Go deeper").
   */
  say(text: string, opts: { interrupt?: boolean; cooldownMs?: number } = {}): void {
    if (!this.enabled || !this.synth) return;
    const now = Date.now();
    const last = this.lastSpoken.get(text);
    if (opts.cooldownMs && last !== undefined && now - last < opts.cooldownMs) return;
    this.lastSpoken.set(text, now);

    if (opts.interrupt) this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.lang = 'en-US';
    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth?.cancel();
  }
}

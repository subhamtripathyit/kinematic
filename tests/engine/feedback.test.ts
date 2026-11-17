import { describe, expect, it } from 'vitest';
import { FeedbackGate } from '../../src/engine/feedback';

const lean = { id: 'lean', message: 'Keep your chest up', level: 'warn' as const };

describe('FeedbackGate', () => {
  it('ignores an error that lasts only one frame', () => {
    const gate = new FeedbackGate(5, 1500);
    expect(gate.update(lean, 0)).toBeNull();
    expect(gate.update(null, 33)).toBeNull();
  });

  it('shows an error after it persists, and keeps it on screen for a while', () => {
    const gate = new FeedbackGate(3, 1500);
    gate.update(lean, 0);
    gate.update(lean, 33);
    expect(gate.update(lean, 66)?.id).toBe('lean');
    expect(gate.update(null, 500)?.id).toBe('lean');
    expect(gate.update(null, 2000)).toBeNull();
  });

  it('lets a warning replace a "good" message right away', () => {
    const gate = new FeedbackGate(2, 1500);
    const good = { id: 'holding', message: 'Hold it', level: 'good' as const };
    gate.update(good, 0);
    gate.update(good, 33);
    expect(gate.update(good, 66)?.id).toBe('holding');
    gate.update(lean, 100);
    expect(gate.update(lean, 133)?.id).toBe('lean');
  });
});

import { describe, it, expect } from 'vitest';
import {
  isObjectiveComplete,
  objectiveCompletionFraction,
  protocolProgress,
  calibratedTarget,
} from './objectives';

describe('isObjectiveComplete', () => {
  it('is complete once current meets a numeric target', () => {
    expect(isObjectiveComplete({ kind: 'repetitions', target: 25, current: 25 })).toBe(true);
    expect(isObjectiveComplete({ kind: 'repetitions', target: 25, current: 24 })).toBe(false);
    expect(isObjectiveComplete({ kind: 'repetitions', target: 25, current: 30 })).toBe(true);
  });

  it('treats checklist and binary objectives as 0/1 regardless of target', () => {
    expect(isObjectiveComplete({ kind: 'checklist', target: null, current: 0 })).toBe(false);
    expect(isObjectiveComplete({ kind: 'checklist', target: null, current: 1 })).toBe(true);
    expect(isObjectiveComplete({ kind: 'binary', target: null, current: 1 })).toBe(true);
  });
});

describe('objectiveCompletionFraction', () => {
  it('is a clamped 0-1 ratio of current to target', () => {
    expect(objectiveCompletionFraction({ kind: 'repetitions', target: 25, current: 0 })).toBe(0);
    expect(objectiveCompletionFraction({ kind: 'repetitions', target: 25, current: 12.5 })).toBe(0.5);
    expect(objectiveCompletionFraction({ kind: 'repetitions', target: 25, current: 25 })).toBe(1);
  });

  it('never exceeds 1 even when over-shot', () => {
    expect(objectiveCompletionFraction({ kind: 'repetitions', target: 25, current: 50 })).toBe(1);
  });

  it('never goes negative', () => {
    expect(objectiveCompletionFraction({ kind: 'repetitions', target: 25, current: -5 })).toBe(0);
  });

  it('treats a zero or negative target as trivially satisfied rather than dividing by zero', () => {
    expect(objectiveCompletionFraction({ kind: 'quantity', target: 0, current: 0 })).toBe(1);
  });

  it('resolves checklist/binary as exactly 0 or 1', () => {
    expect(objectiveCompletionFraction({ kind: 'checklist', target: null, current: 0 })).toBe(0);
    expect(objectiveCompletionFraction({ kind: 'checklist', target: null, current: 1 })).toBe(1);
  });
});

describe('protocolProgress', () => {
  it('counts only mandatory objectives toward completion', () => {
    const objectives = [
      { kind: 'repetitions' as const, target: 25, current: 25, optional: false },
      { kind: 'repetitions' as const, target: 40, current: 40, optional: false },
      { kind: 'quantity' as const, target: 8, current: 0, optional: true }, // undone, optional
    ];
    const progress = protocolProgress(objectives);
    expect(progress.total).toBe(2);
    expect(progress.completed).toBe(2);
    expect(progress.fraction).toBe(1);
  });

  it('an undone optional objective never blocks full completion', () => {
    const objectives = [
      { kind: 'repetitions' as const, target: 25, current: 25, optional: false },
      { kind: 'quantity' as const, target: 8, current: 0, optional: true },
    ];
    expect(protocolProgress(objectives).fraction).toBe(1);
  });

  it('reports partial progress across mandatory objectives', () => {
    const objectives = [
      { kind: 'repetitions' as const, target: 25, current: 25, optional: false },
      { kind: 'repetitions' as const, target: 40, current: 0, optional: false },
    ];
    const progress = protocolProgress(objectives);
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.fraction).toBe(0.5);
  });

  it('a protocol with no mandatory objectives is trivially complete', () => {
    expect(protocolProgress([]).fraction).toBe(1);
  });
});

describe('calibratedTarget', () => {
  it('uses 80% of a stated comfortable capacity, never the full maximum', () => {
    expect(calibratedTarget(30, 10)).toBe(24);
  });

  it('rounds to a whole number', () => {
    expect(calibratedTarget(25, 10)).toBe(20);
  });

  it('falls back to the conservative default when no baseline is set', () => {
    expect(calibratedTarget(null, 10)).toBe(10);
  });

  it('falls back to the default for a non-positive baseline value', () => {
    expect(calibratedTarget(0, 10)).toBe(10);
    expect(calibratedTarget(-5, 10)).toBe(10);
  });

  it('never calibrates to a fixed extreme benchmark regardless of input', () => {
    // The exact failure mode the milestone forbids: prescribing 100 push-ups.
    expect(calibratedTarget(500, 10)).toBeLessThan(500);
    expect(calibratedTarget(500, 10)).toBe(400);
  });

  it('never returns less than 1', () => {
    expect(calibratedTarget(1, 10)).toBeGreaterThanOrEqual(1);
  });
});

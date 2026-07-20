/**
 * Seeded pseudo-random generator (mulberry32).
 *
 * Quest generation must be *deterministic*: the same inputs and seed produce
 * the same quests. That makes generation testable, debuggable, and honestly
 * explainable — the rationale shown to the user is the real decision input
 * rather than a story reconstructed afterwards. `Math.random()` would make all
 * three impossible.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max]. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('cannot pick from an empty array');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Fisher–Yates shuffle. Returns a new array; the input is untouched. */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      const a = result[i] as T;
      const b = result[j] as T;
      result[i] = b;
      result[j] = a;
    }
    return result;
  }
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Build a stable seed for a user's day.
 *
 * Keyed on the date so a day's offered quests stay stable across restarts —
 * closing and reopening the app must never reroll the day, which would both
 * feel arbitrary and invite reroll-farming.
 */
export function dailySeed(userId: string, date: string): string {
  return `${userId}:${date}`;
}

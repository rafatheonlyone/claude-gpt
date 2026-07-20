/**
 * Clock port (ADR-0003).
 *
 * SYSTEM is saturated with time-dependent behaviour: daily quest generation,
 * streaks, mastery decay, recovery windows, age-sensitive safety rules. Reading
 * the wall clock directly would make all of it untestable and would make
 * date-boundary bugs — the kind that silently corrupt a streak at midnight —
 * essentially undetectable.
 */
export interface ClockAdapter {
  /** Current instant. */
  now(): Date;

  /** Current local calendar date as `YYYY-MM-DD`, in the user's timezone. */
  today(): string;

  /** IANA timezone identifier, e.g. `America/Sao_Paulo`. */
  timezone(): string;
}

/** Real clock, backed by the host system. */
export class SystemClock implements ClockAdapter {
  constructor(private readonly zone?: string) {}

  now(): Date {
    return new Date();
  }

  today(): string {
    return toLocalDateString(this.now(), this.timezone());
  }

  timezone(): string {
    return this.zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/**
 * Controllable clock for tests. Time only moves when a test moves it, so
 * date-boundary behaviour can be asserted rather than hoped for.
 */
export class FixedClock implements ClockAdapter {
  constructor(
    private current: Date,
    private readonly zone = 'UTC',
  ) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  today(): string {
    return toLocalDateString(this.current, this.zone);
  }

  timezone(): string {
    return this.zone;
  }

  set(date: Date): void {
    this.current = new Date(date.getTime());
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  advanceDays(days: number): void {
    this.advanceMs(days * 24 * 60 * 60 * 1000);
  }
}

/**
 * Format an instant as a `YYYY-MM-DD` calendar date in the given timezone.
 *
 * Uses `Intl` rather than the UTC getters because "which day is it" must follow
 * the user's timezone. Using UTC would shift the day boundary for a user in
 * Brazil by three hours, quietly mis-attributing late-evening work to tomorrow.
 */
export function toLocalDateString(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Whole days between two `YYYY-MM-DD` strings (`b - a`). */
export function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / msPerDay);
}

/** Shift a `YYYY-MM-DD` string by a number of days. */
export function addDays(date: string, days: number): string {
  const result = new Date(Date.parse(`${date}T00:00:00Z`) + days * 24 * 60 * 60 * 1000);
  return result.toISOString().slice(0, 10);
}

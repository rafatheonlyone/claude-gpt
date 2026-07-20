/** A schema migration. Migrations are immutable once released. */
export interface Migration {
  /** Sequential, starting at 1. */
  readonly version: number;
  /** Stable identifier, `snake_case`, ASCII only. */
  readonly name: string;
  /** Forward DDL. May contain several statements. */
  readonly up: string;
  /** Reverse DDL. Used in development only; never run automatically. */
  readonly down: string;
}

export interface AppliedMigration {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly appliedAt: string;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly version: number,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Checksum for tamper detection, not for security.
 *
 * A released migration must never be edited: doing so means two databases claim
 * the same schema version while actually differing, which is a corruption class
 * that surfaces months later and is nearly impossible to diagnose. Comparing
 * checksums turns that into a loud failure at startup.
 *
 * FNV-1a is chosen because it is synchronous and dependency-free; `crypto.subtle`
 * is async and cryptographic strength buys nothing against accidental edits.
 */
export function checksum(input: string): string {
  // Normalise whitespace so reformatting alone does not trip the check.
  const normalised = input.replace(/\s+/g, ' ').trim();

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < normalised.length; i += 1) {
    const code = normalised.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + code) >>> 0;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }

  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

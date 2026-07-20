/**
 * UUIDv7 — time-ordered identifiers.
 *
 * Chosen over UUIDv4 because IDs sort chronologically, which matters for an
 * append-only event log queried by time across many years: the primary key
 * index stays close to insertion order instead of scattering writes across the
 * B-tree, and `ORDER BY id` is a valid chronological ordering without a join.
 *
 * Layout (RFC 9562):
 *   48 bits  Unix timestamp in milliseconds
 *    4 bits  version (7)
 *   12 bits  sub-millisecond counter
 *    2 bits  variant (0b10)
 *   62 bits  randomness
 */

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

let lastTimestamp = -1;
let counter = 0;

export function uuidv7(now: number = Date.now()): string {
  // A monotonic counter keeps IDs strictly ordered when several are minted
  // inside the same millisecond, which happens routinely when one action emits
  // a burst of related events.
  if (now === lastTimestamp) {
    counter = (counter + 1) & 0x0fff;
  } else {
    lastTimestamp = now;
    counter = 0;
  }

  const bytes = new Uint8Array(16);

  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  bytes[6] = 0x70 | ((counter >>> 8) & 0x0f);
  bytes[7] = counter & 0xff;

  const random = new Uint8Array(8);
  globalThis.crypto.getRandomValues(random);
  bytes.set(random, 8);

  // Variant bits: 0b10xxxxxx
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  let out = '';
  for (let i = 0; i < 16; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += '-';
    out += HEX[bytes[i] ?? 0];
  }
  return out;
}

/** Extract the millisecond timestamp encoded in a UUIDv7. */
export function timestampFromUuidv7(id: string): number {
  const hex = id.replace(/-/g, '').slice(0, 12);
  return Number.parseInt(hex, 16);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidv7(value: string): boolean {
  return UUID_PATTERN.test(value);
}

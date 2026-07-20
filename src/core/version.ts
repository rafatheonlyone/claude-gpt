/**
 * Application version shown in Settings → About.
 *
 * Kept as a manually maintained constant rather than read from `package.json`
 * at runtime: the portable core must not depend on Node's filesystem or on
 * bundler-specific JSON imports (ADR-0003). Update this alongside
 * `package.json`'s `version` field — `docs/TESTING.md` notes the two must
 * agree.
 */
export const APP_VERSION = '0.1.0';

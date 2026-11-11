/**
 * L2 router-name hints (VOY-F-15): tokenization, exclusion list, table lookup.
 * Pure functions, no clock, no randomness, no network (§0.6).
 */
export { EXCLUDED_TOKENS } from './excluded.ts';
export { splitRouterName, stripTrailingDigits } from './tokens.ts';
export { findHints, normalizeCityName } from './find.ts';

/**
 * Thin adapter over `@packet-voyage/core` (§5.9).
 *
 * Two tiers of access:
 * 1. STABLE modules (L1/L2: parse, addr, geo, hints, envelope, settings) are
 *    imported statically through deep relative paths — they exist already and
 *    the contract freezes them. Deep paths bypass the package "exports" map
 *    and the conditional Vite alias, so they resolve identically under
 *    `vite build` and `vitest`.
 * 2. OPTIONAL modules (pipeline/story/redact — written by parallel lots) are
 *    reached through a guarded dynamic import of the package specifier.
 *    `apps/web/vite.config.ts` aliases `@packet-voyage/core` to a local stub
 *    while the barrel is incomplete, so the browser build never breaks;
 *    at runtime the promise rejection is caught and the caller falls back
 *    to fixture data / the local name-hints computation.
 */
import type { Journey, RedactionLevel, Stamp, StoryEntry } from '@packet-voyage/schema';

import type { Settings } from '../../../../packages/core/src/settings.ts';
import { DEFAULT_SETTINGS, withSettings } from '../../../../packages/core/src/settings.ts';
import type { ParsedTrace, TraceFormat } from '../../../../packages/core/src/parse/index.ts';
import { parseTrace, detectFormat } from '../../../../packages/core/src/parse/index.ts';
import { computeEnvelopes, lightFloorMs } from '../../../../packages/core/src/envelope/index.ts';
import { findHints } from '../../../../packages/core/src/hints/index.ts';
import { greatCirclePoints, haversineKm, toMiles } from '../../../../packages/core/src/geo/index.ts';
import { classifyAddress, isDocumentationAddress } from '../../../../packages/core/src/addr/index.ts';

export type { Settings, ParsedTrace, TraceFormat };
export {
  DEFAULT_SETTINGS,
  withSettings,
  parseTrace,
  detectFormat,
  computeEnvelopes,
  lightFloorMs,
  findHints,
  greatCirclePoints,
  haversineKm,
  toMiles,
  classifyAddress,
  isDocumentationAddress,
};

/** Shape of the optional core surface this site uses (all members optional). */
export interface CoreOptional {
  computeJourney?: (input: Record<string, unknown>) => Journey;
  buildStory?: (journey: Journey, settings: Settings) => StoryEntry[];
  passport?: (journey: Journey) => Stamp[];
  redactJourney?: (journey: Journey, level: RedactionLevel) => Journey;
  checkVocabulary?: (text: string) => { ok: boolean; violations: string[] };
}

let cachedOptional: CoreOptional | null = null;

/** Load the optional core surface; `{}` when the modules are not written yet. */
export async function loadOptionalCore(): Promise<CoreOptional> {
  if (cachedOptional) return cachedOptional;
  try {
    const mod = (await import('@packet-voyage/core')) as unknown;
    const core = (mod ?? {}) as CoreOptional;
    cachedOptional = typeof core.computeJourney === 'function' ||
      typeof core.buildStory === 'function' ||
      typeof core.checkVocabulary === 'function'
      ? core
      : {};
  } catch {
    cachedOptional = {};
  }
  return cachedOptional;
}

/** Synchronous probe for tests and initial render. */
export function optionalCore(): CoreOptional {
  return cachedOptional ?? {};
}

/** Warm the optional-core cache without awaiting it (called once at boot). */
export function preloadOptionalCore(): void {
  void loadOptionalCore();
}

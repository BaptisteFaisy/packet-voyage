/**
 * The insights model: distance bounds, delay breakdown, compatible media and
 * the era comparison (§5.2-§5.4), all computed by `@packet-voyage/core`.
 *
 * Pure: no React, no DOM, no network. Numbers stay raw here; the component
 * formats them per unit and language, and shows the core's own bilingual
 * notes verbatim — they are already vocabulary-clean.
 */
import type { Cable, Journey } from '@packet-voyage/schema';
import {
  MEDIA,
  compareWithEra,
  delayBreakdown,
  distanceBounds,
  mediaForJourney,
} from '@packet-voyage/core';
import type {
  DelayBreakdown,
  DistanceBounds,
  EraComparison,
  Medium,
  MediumCheck,
} from '@packet-voyage/core';
import type { Language } from '../i18n/context.tsx';

/**
 * Fixed years offered in the era picker: 1988 is the first transatlantic
 * fibre era (TAT-8), then a step per decade of the dataset. The trace year
 * is added by `eraChoices`, so the list always ends "today".
 */
const ERA_BASE_YEARS = [1988, 1995, 2000, 2010, 2020];

export interface InsightsModel {
  /** Distance range: a geodesic lower bound and a fibre delay budget. */
  bounds: DistanceBounds;
  /** Measured delay, light floor and the inferred residual. */
  breakdown: DelayBreakdown;
  /** The five media, sorted by the minimum round trip each would need. */
  media: MediumCheck[];
  /** Compatible cables at `era.year` and at the trace date. */
  era: EraComparison;
  /** Years offered by the picker, strictly ascending. */
  eraYears: number[];
  /** Year of the trace itself. */
  traceYear: number;
}

/**
 * The year of the trace. The ISO prefix is the year the traceroute was run
 * where it was run; `Date` would shift it across a year boundary in UTC.
 */
export function traceYearOf(journey: Journey): number {
  const iso = /^(\d{4})/.exec(journey.traced_at);
  if (iso) return Number(iso[1]);
  const parsed = new Date(journey.traced_at);
  return Number.isNaN(parsed.getTime()) ? new Date().getUTCFullYear() : parsed.getUTCFullYear();
}

/** The picker years: the fixed eras up to the trace, plus the trace year. */
export function eraChoices(journey: Journey): number[] {
  const traceYear = traceYearOf(journey);
  const years = new Set<number>([traceYear]);
  for (const year of ERA_BASE_YEARS) {
    if (year <= traceYear) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

/**
 * Readable name of a medium, in the reader's language. The wording comes
 * from the single table the core exports, so the five media are named the
 * same way everywhere in the product.
 */
export function formatMediaLabel(medium: Medium, language: Language): string {
  const entry = MEDIA.find((item) => item.medium === medium);
  return entry ? entry.label[language] : medium;
}

/**
 * Everything the insights panel renders, in one plain object. `cables` may
 * be empty (datasets still loading): the era counts then stay at zero and
 * the core's verdict says the comparison cannot see much.
 */
export function insightsModel(journey: Journey, cables: Cable[], year: number): InsightsModel {
  return {
    bounds: distanceBounds(journey),
    breakdown: delayBreakdown(journey),
    media: mediaForJourney(journey),
    era: compareWithEra({ journey, cables, year }),
    eraYears: eraChoices(journey),
    traceYear: traceYearOf(journey),
  };
}

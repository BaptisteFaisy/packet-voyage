/**
 * Two journeys side by side, as structured facts (VOY-F-29): the same target
 * over IPv4 and IPv6, or the same route at two moments.
 *
 * The sentence states what changed and never why: attributing a difference to a
 * cause would be a claim the measurement cannot support (§5.4).
 */
import type { Journey } from '@packet-voyage/schema';
import { num } from '../story/index.ts';

export interface JourneyDiff {
  same_target: boolean;
  distance_km: { a: number; b: number; delta: number };
  rtt_ms: { a: number | null; b: number | null; delta: number | null };
  inflation: { a: number | null; b: number | null; delta: number | null };
  countries_added: string[];
  countries_removed: string[];
  networks_added: number[];
  networks_removed: number[];
  hops: { a: number; b: number };
  located_hops: { a: number; b: number };
  rejected_by_light: { a: number; b: number };
  detours: { a: number; b: number };
  path_changed: boolean;
  city_path: { a: string[]; b: string[] };
  sentence: { en: string; fr: string };
}

function cityPath(journey: Journey): string[] {
  return journey.hops
    .filter((hop) => hop.location)
    .map((hop) => hop.location?.city ?? '')
    .filter((city) => city !== '');
}

function locatedCount(journey: Journey): number {
  return journey.hops.filter((hop) => hop.location !== null).length;
}

function networkSet(journey: Journey): number[] {
  return [...new Set(journey.hops.map((hop) => hop.asn).filter((asn): asn is number => asn != null))].sort(
    (a, b) => a - b,
  );
}

function added(a: string[], b: string[]): string[] {
  return b.filter((item) => !a.includes(item));
}

function delta(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : b - a;
}

function sign(value: number, unit: string, language: 'en' | 'fr'): string {
  const word = value >= 0
    ? language === 'fr' ? 'plus long' : 'longer'
    : language === 'fr' ? 'plus court' : 'shorter';
  return `${language === 'fr' ? 'au moins' : 'at least'} ${num(Math.abs(value), language, 0)} ${unit} ${word}`;
}

function sentenceOf(diff: Omit<JourneyDiff, 'sentence'>): { en: string; fr: string } {
  const countries = diff.countries_added.length > 0
    ? `it adds ${diff.countries_added.join(', ')}`
    : diff.countries_removed.length > 0
      ? `it no longer shows ${diff.countries_removed.join(', ')}`
      : 'the countries are the same';
  const pays = diff.countries_added.length > 0
    ? `il ajoute ${diff.countries_added.join(', ')}`
    : diff.countries_removed.length > 0
      ? `il ne montre plus ${diff.countries_removed.join(', ')}`
      : 'les pays sont les mêmes';
  const pathEn = diff.path_changed ? ' The located city path differs.' : ' The located city path is the same.';
  const pathFr = diff.path_changed ? ' Le chemin des villes localisées diffère.' : ' Le chemin des villes localisées est identique.';
  return {
    en: `Route B is ${sign(diff.distance_km.delta, 'km', 'en')}, ` +
      `${delta(diff.rtt_ms.a, diff.rtt_ms.b) === null ? 'no comparable delay' : `${num(Math.abs(diff.rtt_ms.delta ?? 0), 'en', 1)} ms ${ (diff.rtt_ms.delta ?? 0) >= 0 ? 'slower' : 'faster'}`}; ` +
      `${countries}.${pathEn}`,
    fr: `La route B est ${sign(diff.distance_km.delta, 'km', 'fr')}, ` +
      `${delta(diff.rtt_ms.a, diff.rtt_ms.b) === null ? 'aucun délai comparable' : `${num(Math.abs(diff.rtt_ms.delta ?? 0), 'fr', 1)} ms ${ (diff.rtt_ms.delta ?? 0) >= 0 ? 'plus lente' : 'plus rapide'}`}; ` +
      `${pays}.${pathFr}`,
  };
}

/** Compare two journeys; both must already be computed (and usually redacted). */
export function diffJourneys(a: Journey, b: Journey): JourneyDiff {
  const base = {
    same_target: a.target.host === b.target.host && (a.target.ip ?? null) === (b.target.ip ?? null),
    distance_km: {
      a: a.summary.distance_km_min,
      b: b.summary.distance_km_min,
      delta: b.summary.distance_km_min - a.summary.distance_km_min,
    },
    rtt_ms: { a: a.summary.rtt_ms ?? null, b: b.summary.rtt_ms ?? null, delta: delta(a.summary.rtt_ms ?? null, b.summary.rtt_ms ?? null) },
    inflation: {
      a: a.summary.inflation ?? null,
      b: b.summary.inflation ?? null,
      delta: delta(a.summary.inflation ?? null, b.summary.inflation ?? null),
    },
    countries_added: added(a.summary.countries, b.summary.countries),
    countries_removed: added(b.summary.countries, a.summary.countries),
    networks_added: networkSet(b).filter((asn) => !networkSet(a).includes(asn)),
    networks_removed: networkSet(a).filter((asn) => !networkSet(b).includes(asn)),
    hops: { a: a.hops.length, b: b.hops.length },
    located_hops: { a: locatedCount(a), b: locatedCount(b) },
    rejected_by_light: { a: a.summary.rejected_by_light, b: b.summary.rejected_by_light },
    detours: { a: a.summary.detours.length, b: b.summary.detours.length },
    path_changed: cityPath(a).join('|') !== cityPath(b).join('|'),
    city_path: { a: cityPath(a), b: cityPath(b) },
  };
  return { ...base, sentence: sentenceOf(base) };
}

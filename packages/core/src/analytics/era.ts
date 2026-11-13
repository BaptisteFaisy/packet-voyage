/**
 * The same journey in another year: which cables of the dataset were already in
 * service, and which of them are compatible with the crossings of this route.
 *
 * Honest by construction — the dataset describes today's network, so a cable
 * retired before the chosen year may be missing or only partly mapped. The
 * verdict says so, and never says which cable carried anything (§5.4).
 */
import type { Cable, Journey } from '@packet-voyage/schema';
import { compatibleCables } from '../cables/index.ts';
import type { Settings } from '../settings.ts';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';

export interface EraCable {
  id: string;
  name: string;
  rfs_year: number | null;
  length_km: number | null;
  compatibility: number;
  band: 'high' | 'medium' | 'low';
}

export interface EraComparison {
  year: number;
  available_then: number;
  /** Cables in the dataset with no commissioning year: the comparison cannot see them. */
  undated: number;
  compatible_then: EraCable[];
  compatible_now: EraCable[];
  crossings: number;
  verdict: { en: string; fr: string };
}

function crossingsOf(journey: Journey): Journey['segments'] {
  return journey.segments.filter((segment) => segment.kind === 'sea' || segment.kind === 'sea-or-fixed');
}

/** Cables the dataset dates as already in service that year. */
export function inServiceInYear(cables: Cable[], year: number): Cable[] {
  return cables.filter(
    (cable) => cable.status === 'in-service' && cable.rfs_year != null && cable.rfs_year <= year,
  );
}

function bestPerCable(matches: EraCable[]): EraCable[] {
  const best = new Map<string, EraCable>();
  for (const match of matches) {
    const current = best.get(match.id);
    if (!current || current.compatibility < match.compatibility) best.set(match.id, match);
  }
  return [...best.values()].sort(
    (a, b) => b.compatibility - a.compatibility || a.id.localeCompare(b.id),
  );
}

function compatibleFor(
  journey: Journey,
  cables: Cable[],
  tracedAt: string,
  settings: Settings,
): EraCable[] {
  const found: EraCable[] = [];
  for (const segment of crossingsOf(journey)) {
    const result = compatibleCables(segment, cables, tracedAt, settings);
    for (const cable of result.cables) {
      found.push({
        id: cable.id,
        name: cable.name,
        rfs_year: cable.rfs_year ?? null,
        length_km: cable.length_km ?? null,
        compatibility: cable.compatibility,
        band: cable.band,
      });
    }
  }
  return bestPerCable(found);
}

function verdictOf(comparison: Omit<EraComparison, 'verdict'>): { en: string; fr: string } {
  const then = comparison.compatible_then.length;
  const now = comparison.compatible_now.length;
  const blind = comparison.undated > 0
    ? ` ${comparison.undated} cable(s) in this dataset carry no commissioning year, so they are invisible to this comparison.`
    : '';
  const aveugle = comparison.undated > 0
    ? ` ${comparison.undated} câble(s) de ce jeu n'ont pas d'année de mise en service : cette comparaison ne les voit pas.`
    : '';
  return {
    en: `In ${comparison.year}, ${comparison.available_then} dated cable(s) of this dataset were in service; ` +
      `${then} of them are compatible with the ${comparison.crossings} sea crossing(s) of this journey, ` +
      `against ${now} compatible at the trace date.${blind} The dataset describes today's network, so cables ` +
      `retired since are under-represented, and nothing here says which one carried the packet.`,
    fr: `En ${comparison.year}, ${comparison.available_then} câble(s) daté(s) de ce jeu étaient en service ; ` +
      `${then} d'entre eux sont compatibles avec les ${comparison.crossings} traversée(s) maritime(s) de ce trajet, ` +
      `contre ${now} à la date de la trace.${aveugle} Le jeu décrit le réseau d'aujourd'hui : les câbles retirés ` +
      `depuis y sont sous-représentés, et rien ici ne dit lequel a porté le paquet.`,
  };
}

/** Compare the compatible cables of a journey at its trace date and at `year`. */
export function compareWithEra(input: {
  journey: Journey;
  cables: Cable[];
  year: number;
  settings?: Partial<Settings>;
}): EraComparison {
  const settings = input.settings ? withSettings(input.settings) : DEFAULT_SETTINGS;
  const then = `${input.year}-06-01T00:00:00Z`;
  const poolThen = inServiceInYear(input.cables, input.year);
  const base = {
    year: input.year,
    available_then: poolThen.length,
    undated: input.cables.filter((cable) => cable.rfs_year == null).length,
    compatible_then: compatibleFor(input.journey, poolThen, then, settings),
    compatible_now: compatibleFor(input.journey, input.cables, input.journey.traced_at, settings),
    crossings: crossingsOf(input.journey).length,
  };
  return { ...base, verdict: verdictOf(base) };
}

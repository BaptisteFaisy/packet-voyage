/**
 * The journey log (VOY-F-35): templates over the structured journey, in hop
 * order, so the story and the map can never disagree.
 *
 * Every entry carries its certainty level (§5.3): the delays and the silences
 * are measured, the cities and networks are inferred, and anything said about
 * the medium — the crossing, the cables — is assumed.
 */
import type { Journey, StoryEntry } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';
import { arrivalTexts, crossingTexts, gapTexts, rejectedTexts, stopTexts } from './templates.ts';

function hopEntries(hop: Journey['hops'][number], settings: Settings): StoryEntry[] {
  const entries: StoryEntry[] = [];
  const location = hop.location ?? null;

  if (location) {
    const texts = stopTexts(hop, location);
    entries.push({ kind: 'stop', ttl: hop.ttl, certainty: 'inferred', en: texts.en, fr: texts.fr });
    for (const rejection of location.rejected) {
      const rejected = rejectedTexts(hop, rejection, settings);
      entries.push({
        kind: 'rejected',
        ttl: hop.ttl,
        certainty: 'measured',
        en: rejected.en,
        fr: rejected.fr,
      });
    }
    return entries;
  }

  if (hop.class !== 'public') return entries;
  const texts = gapTexts(hop);
  entries.push({ kind: 'gap', ttl: hop.ttl, certainty: 'measured', en: texts.en, fr: texts.fr });
  return entries;
}

function crossingEntries(journey: Journey, settings: Settings, afterTtl: number): StoryEntry[] {
  return journey.segments
    .filter((segment) => segment.from_ttl === afterTtl && segment.kind !== 'local')
    .map((segment) => {
      const texts = crossingTexts(segment, settings);
      return { kind: 'crossing' as const, ttl: null, certainty: 'assumed' as const, en: texts.en, fr: texts.fr };
    });
}

/** Build the whole log: stops, rejections, gaps, crossings, then the arrival. */
export function buildStory(journey: Journey, settings: Settings): StoryEntry[] {
  const entries: StoryEntry[] = [];

  for (const hop of journey.hops) {
    entries.push(...hopEntries(hop, settings));
    entries.push(...crossingEntries(journey, settings, hop.ttl));
  }

  const arrival = arrivalTexts(journey, settings);
  entries.push({ kind: 'arrival', ttl: null, certainty: 'inferred', en: arrival.en, fr: arrival.fr });
  return entries;
}

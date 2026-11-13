import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Journey, StoryEntry } from '@packet-voyage/schema';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { arbFullJourney } from '../testing/journey-arbitrary.ts';
import { localTimeAtHop } from '../clocks/index.ts';
import { everydayScale, lightDistanceKm } from '../scale/index.ts';
import { buildStory } from './story.ts';
import { assertStoryNumbersComeFromJourney, extractNumbers, journeyNumbers } from './numbers.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261121;

/** The one located hop of the hand-written journey. */
function minimalHop(): Journey['hops'][number] {
  return {
    ttl: 1,
    replies: [{ ip: '198.51.100.1', rtt_ms: [12.5] }],
    class: 'public',
    asn: 64500,
    as_name: 'Example Net',
    prefix: '198.51.100.0/24',
    envelope_ms: 12.5,
    location: {
      lat: 48.8566,
      lon: 2.3522,
      city: 'Paris',
      country: 'FR',
      confidence: 0.9,
      level: 'solid',
      sources: ['declared'],
      rejected: [],
    },
  };
}

/** Its crossing: a sea segment no cable of the dataset is compatible with. */
function minimalSegment(): Journey['segments'][number] {
  return {
    from_ttl: 1,
    to_ttl: 2,
    kind: 'sea',
    geodesic_km: 6655.4,
    delta_ms: 91.7,
    skipped_hops: 0,
    cables: [],
    other_cables: 2,
    fixed_link: null,
  };
}

/** The numbers of the arrival banner. */
function minimalSummary(): Journey['summary'] {
  return {
    distance_km_min: 6655.4,
    rtt_ms: 91.7,
    light_floor_ms: 22.1,
    inflation: 1.44,
    countries: ['FR'],
    networks: 1,
    ixps: 0,
    detours: [],
    rejected_by_light: 0,
    gaps: 0,
  };
}

/** A hand-written journey: small enough to reason about, complete enough to log. */
function minimalJourney(): Journey {
  return {
    version: 1,
    traced_at: '2026-11-12T09:14:03Z',
    tool: 'traceroute',
    protocol: 'icmp',
    family: 4,
    source: null,
    target: { host: 'www.example.org', ip: '203.0.113.80' },
    hops: [minimalHop()],
    segments: [minimalSegment()],
    summary: minimalSummary(),
    credits: [],
    redaction: null,
  };
}

/** One entry of the log, carrying the given sentence in both languages. */
function entryWith(text: string): StoryEntry[] {
  return [{ kind: 'arrival', ttl: null, certainty: 'inferred', en: text, fr: text }];
}

describe('reading the numbers of a sentence (§5.4)', () => {
  it('reads the thousands of both languages, and the decimals of both', () => {
    expect(extractNumbers('at least 6,655 km as the crow flies')).toEqual([6655]);
    expect(extractNumbers('au moins 1 439 km')).toEqual([1439]);
    expect(extractNumbers('au moins 1\u202f439 km')).toEqual([1439]);
    expect(extractNumbers('91.7 ms measured')).toEqual([91.7]);
    expect(extractNumbers('91,7 ms mesurées')).toEqual([91.7]);
    expect(extractNumbers('inflation ×1,31')).toEqual([1.31]);
    expect(extractNumbers('1,234,567')).toEqual([1234567]);
    expect(extractNumbers('6,655.43')).toEqual([6655.43]);
  });

  it('reads the digits a name carries, and nothing else', () => {
    expect(extractNumbers('2Africa, AAE-1')).toEqual([2, 1]);
    expect(extractNumbers('203.0.113.80')).toEqual([203, 0, 113, 80]);
    expect(extractNumbers('Stop 3 — Paris, France (solid). Network: AS64500. 12.5 ms after departure.'))
      .toEqual([3, 64500, 12.5]);
    expect(extractNumbers('Hop 4 — not located. 2 answer(s) recorded.')).toEqual([4, 2]);
    expect(extractNumbers('no digits here')).toEqual([]);
    expect(extractNumbers('')).toEqual([]);
  });

  it('keeps two adjacent numbers apart when they are not a group', () => {
    expect(extractNumbers('12 34')).toEqual([12, 34]);
  });
});

describe('the numbers of a journey', () => {
  const journey = minimalJourney();
  const numbers = journeyNumbers(journey);

  it('holds every value the journey carries', () => {
    for (const value of [6655.4, 91.7, 22.1, 1.44, 12.5, 64500, 1, 2, 48.8566, 2.3522, 0.9]) {
      expect(numbers, `missing ${value}`).toContain(value);
    }
  });

  it('holds the numbers written inside its names and addresses', () => {
    expect(numbers).toContain(203);
    expect(numbers).toContain(113);
    expect(numbers).toContain(80);
    expect(numbers).toContain(2026);
  });

  it('counts what the log counts: the answers and the cables', () => {
    expect(numbers).toContain(journey.hops[0]!.replies.length);
    expect(numbers).toContain(journey.segments[0]!.cables.length);
  });

  it('is sorted and without duplicates', () => {
    expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b));
  });

  it('does not read the log as its own evidence', () => {
    const story = entryWith('At least 4 242 km as the crow flies');
    const withStory: Journey = { ...journey, story };
    expect(journeyNumbers(withStory)).not.toContain(4242);
    expect(assertStoryNumbersComeFromJourney(story, withStory)).toEqual(['4242']);
  });
});

describe('the honesty of the log (§5.4)', () => {
  const journey = minimalJourney();

  it('finds nothing to blame in a log built from the journey', () => {
    expect(assertStoryNumbersComeFromJourney(buildStory(journey, DEFAULT_SETTINGS), journey)).toEqual([]);
  });

  it('names a number the journey does not hold', () => {
    const story = [...buildStory(journey, DEFAULT_SETTINGS), ...entryWith('At least 4 242 km as the crow flies')];
    expect(assertStoryNumbersComeFromJourney(story, journey)).toEqual(['4242']);
  });

  it('names it in either language, and only once', () => {
    const story: StoryEntry[] = [
      { kind: 'stop', ttl: 1, certainty: 'inferred', en: 'Stop 1 — 12 345 km.', fr: 'Étape 1 — 12 345 km.' },
    ];
    expect(assertStoryNumbersComeFromJourney(story, journey)).toEqual(['12345']);
  });

  it('accepts the rounding the log does for reading, and nothing more', () => {
    // The log shows integers for distances and one decimal for delays: the
    // value it prints is the journey's value, rounded to what it shows.
    expect(assertStoryNumbersComeFromJourney(entryWith('At least 6 655 km'), journey)).toEqual([]);
    expect(assertStoryNumbersComeFromJourney(entryWith('91.7 ms measured'), journey)).toEqual([]);
    expect(assertStoryNumbersComeFromJourney(entryWith('inflation 1.44'), journey)).toEqual([]);
    // Half a percent beyond the value is an invention, not a rounding.
    expect(assertStoryNumbersComeFromJourney(entryWith('6 700 km'), journey)).toEqual(['6700']);
    expect(assertStoryNumbersComeFromJourney(entryWith('95 ms'), journey)).toEqual(['95']);
  });

  it(`never lets a generated log show a number of its own (seed ${SEED})`, () => {
    fc.assert(
      fc.property(arbFullJourney, (generated) => {
        const story = buildStory(generated, DEFAULT_SETTINGS);
        expect(story.length).toBeGreaterThan(0);
        // The check must have something to chew on: a log always shows numbers.
        const shown = story.flatMap((entry) => [...extractNumbers(entry.en), ...extractNumbers(entry.fr)]);
        expect(shown.length).toBeGreaterThan(0);
        expect(assertStoryNumbersComeFromJourney(story, generated)).toEqual([]);
      }),
      { seed: SEED, numRuns: 60 },
    );
  });

  it(`reads the same numbers in both languages of a generated log (seed ${SEED})`, () => {
    fc.assert(
      fc.property(arbFullJourney, (generated) => {
        for (const entry of buildStory(generated, DEFAULT_SETTINGS)) {
          expect(extractNumbers(entry.en).sort((a, b) => a - b))
            .toEqual(extractNumbers(entry.fr).sort((a, b) => a - b));
        }
      }),
      { seed: SEED, numRuns: 40 },
    );
  });
});

describe('the derived readings are anchored on the journey', () => {
  const journey = minimalJourney();
  const hop = journey.hops[0]!;
  const location = hop.location!;

  it('takes the scale anchors from the journey, and rounds them to two decimals', () => {
    const rtt = journey.summary.rtt_ms!;
    expect(lightDistanceKm(rtt)).toBeCloseTo(rtt * 299.79, 1);
    const scale = everydayScale(journey.summary.distance_km_min);
    expect(scale.km).toBe(6655.4);
    expect(scale.trips).toBeCloseTo(journey.summary.distance_km_min / 660, 1);
    for (const value of [scale.km, scale.laps, scale.trips]) {
      expect(Number(value.toFixed(2))).toBe(value);
    }
  });

  it('takes the local hour from the instant and the position of the journey', () => {
    const local = localTimeAtHop(location.lon, journey.traced_at);
    // 09:14 UTC, at 2.3522° east: a quarter-hour of solar offset, so 09:29.
    expect(local).toEqual({ time: '09:29', offset: 'UTC+0.25', offsetMinutes: 15 });
    const utcMinutes = 9 * 60 + 14;
    const shifted = (utcMinutes + local.offsetMinutes + 1440) % 1440;
    expect(local.time).toBe(
      `${String(Math.floor(shifted / 60)).padStart(2, '0')}:${String(shifted % 60).padStart(2, '0')}`,
    );
  });

  it('permits a derived reading only when the caller names it', () => {
    const trips = everydayScale(journey.summary.distance_km_min).trips;
    const sentence = `Worth ${trips} Paris–Marseille trips`;
    expect(trips).toBe(10.08);
    expect(assertStoryNumbersComeFromJourney(entryWith(sentence), journey)).toEqual(['10.08']);
    expect(assertStoryNumbersComeFromJourney(entryWith(sentence), journey, [trips])).toEqual([]);
  });

  it('permits the local hour only as a named derivation of the clocks module', () => {
    const local = localTimeAtHop(location.lon, journey.traced_at);
    const sentence = `Passing at ${local.time}`;
    const derived = extractNumbers(sentence);
    expect(derived).toEqual([9, 29]);
    expect(assertStoryNumbersComeFromJourney(entryWith(sentence), journey, derived)).toEqual([]);
  });
});

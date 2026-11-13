import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { JourneySchema } from '@packet-voyage/schema';
import { arbFullJourney } from '../testing/journey-arbitrary.ts';
import {
  decodeShareLink,
  encodeShareLink,
  MAX_FRAGMENT_BYTES,
  ShareDecodeError,
  ShareTooLargeError,
} from './share.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261117;
const BASE = 'https://tradoooo.github.io/packet-voyage/';

const inflate = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('serverless share links (VOY-F-39, VOY-P-17, VOY-P-18)', () => {
  it(`VOY-P-17 decoding a link gives back exactly the journey (seed ${SEED})`, () => {
    fc.assert(
      fc.property(arbFullJourney, (journey) => {
        const link = encodeShareLink(journey, BASE);
        expect(link.startsWith(`${BASE}#j=`)).toBe(true);
        expect(decodeShareLink(link)).toEqual(journey);
        expect(new TextEncoder().encode(link).length).toBeLessThanOrEqual(MAX_FRAGMENT_BYTES);
      }),
      { seed: SEED, numRuns: 60 },
    );
  });

  it('VOY-P-18 / VOY-F-37 every decoded journey validates against the schema', () => {
    fc.assert(
      fc.property(arbFullJourney, (journey) => {
        const decoded = decodeShareLink(encodeShareLink(journey, BASE));
        expect(JourneySchema.safeParse(decoded).success).toBe(true);
      }),
      { seed: SEED, numRuns: 40 },
    );
  });

  it('offers the file instead when the journey does not fit in a fragment', () => {
    const huge = {
      deflate: () => new Uint8Array(MAX_FRAGMENT_BYTES + 10),
      inflate,
    };
    fc.assert(
      fc.property(arbFullJourney, (journey) => {
        expect(() => encodeShareLink(journey, BASE, huge)).toThrow(ShareTooLargeError);
      }),
      { seed: SEED, numRuns: 3 },
    );
  });

  it('refuses a link that carries no journey, with a structured error', () => {
    expect(() => decodeShareLink(`${BASE}#/`)).toThrow(ShareDecodeError);
    expect(() => decodeShareLink(`${BASE}#j=not-base64url!!`)).toThrow();
  });

  it('keeps the journey in the fragment, never in the query string', () => {
    const link = encodeShareLink(
      { ...JSON.parse(JSON.stringify(sampleJourney())) },
      `${BASE}?utm=x`,
    );
    expect(link).not.toContain('?');
    expect(link.indexOf('#j=')).toBeGreaterThan(0);
  });
});

function sampleJourney() {
  return fc.sample(arbFullJourney, { seed: SEED, numRuns: 1 })[0]!;
}

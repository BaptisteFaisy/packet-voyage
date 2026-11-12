import { describe, expect, it } from 'vitest';
import { encodeShareLink, redactJourney } from '@packet-voyage/core';
import type { Journey } from '@packet-voyage/schema';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { loadGallery } from './gallery.ts';
import { decodeShareHash, hasShareFragment } from './share-link.ts';

const BASE_URL = 'https://example.test/';

/** The link exactly as `QrShare` builds it: redaction, then default codecs. */
function shareHashOf(journey: Journey): string {
  const link = encodeShareLink(redactJourney(journey, 'country'), BASE_URL);
  return link.slice(link.indexOf('#'));
}

/** base64url of an arbitrary text, for the broken-payload cases. */
function payloadOf(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `#j=${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

describe('share-link — a link opens the journey it carries', () => {
  it('round-trips the fixture journey through the QrShare encoder', () => {
    const expected = redactJourney(SAMPLE_JOURNEY, 'country');
    const result = decodeShareHash(shareHashOf(SAMPLE_JOURNEY));
    expect(result.status).toBe('journey');
    if (result.status !== 'journey') return;
    expect(result.journey).toEqual(expected);
    expect(result.journey.target.host).toBe(SAMPLE_JOURNEY.target.host);
    expect(result.journey.hops.length).toBe(expected.hops.length);
  });

  it('round-trips a gallery journey too', () => {
    const item = loadGallery().find((entry) => entry.slug === 'ocean-crossing');
    expect(item).toBeTruthy();
    const journey = item?.journey;
    if (!journey) return;
    const result = decodeShareHash(shareHashOf(journey));
    expect(result.status).toBe('journey');
    if (result.status !== 'journey') return;
    expect(result.journey.hops.length).toBe(journey.hops.length);
    expect(result.journey.summary.distance_km_min).toBe(journey.summary.distance_km_min);
  });
});

describe('share-link — every failure is readable content', () => {
  it('says a corrupted payload is unreadable', () => {
    const result = decodeShareHash('#j=not*base64*at*all');
    expect(result.status).toBe('failure');
    if (result.status !== 'failure') return;
    expect(result.failure.reason).toBe('unreadable');
    expect(result.failure.detail.length).toBeGreaterThan(0);
  });

  it('says an empty #j= fragment is unreadable, and never throws', () => {
    expect(hasShareFragment('#j=')).toBe(true);
    const result = decodeShareHash('#j=');
    expect(result.status).toBe('failure');
    if (result.status !== 'failure') return;
    expect(result.failure.reason).toBe('unreadable');
  });

  it('says when the payload is not JSON', () => {
    const result = decodeShareHash(payloadOf('this is not JSON at all'));
    expect(result.status).toBe('failure');
    if (result.status !== 'failure') return;
    expect(result.failure.reason).toBe('invalid-json');
  });

  it('says when the JSON is not a journey', () => {
    // {"version":1}: valid JSON, not a journey.
    const result = decodeShareHash(payloadOf('{"version":1}'));
    expect(result.status).toBe('failure');
    if (result.status !== 'failure') return;
    expect(result.failure.reason).toBe('invalid-schema');
    expect(result.failure.detail).toContain('schema');
  });

  it('says when the payload was truncated', () => {
    // base64url of {"version":1} cut short: not even JSON any more.
    const result = decodeShareHash('#j=eyJ2ZXJzaW9uIjox');
    expect(result.status).toBe('failure');
    if (result.status !== 'failure') return;
    expect(result.failure.reason).toBe('invalid-json');
  });

  it('says when the payload cannot fit in a fragment', () => {
    const result = decodeShareHash(`#j=${'A'.repeat(70_000)}`);
    expect(result.status).toBe('failure');
    if (result.status !== 'failure') return;
    expect(result.failure.reason).toBe('too-large');
    expect(result.failure.bytes ?? 0).toBeGreaterThan(result.failure.limit);
  });
});

describe('share-link — no fragment, no change', () => {
  it('leaves every other hash alone', () => {
    for (const hash of ['', '#/', '#/features', '#/journey/ocean-crossing', '#/settings']) {
      expect(hasShareFragment(hash), hash).toBe(false);
      expect(decodeShareHash(hash), hash).toEqual({ status: 'none' });
    }
  });
});

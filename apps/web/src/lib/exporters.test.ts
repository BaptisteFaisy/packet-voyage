// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UnredactedJourneyError, redactJourney } from '@packet-voyage/core';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { geoJsonDownload, needsRedaction, redactionPlan, reportDownload } from './exporters.ts';

const redacted = redactJourney(SAMPLE_JOURNEY, 'country');

describe('exporters (VOY-F-40 family)', () => {
  it('produces a valid GeoJSON file named after the target and the date', () => {
    const file = geoJsonDownload(SAMPLE_JOURNEY);
    const parsed = JSON.parse(file.text) as {
      type: string;
      features: { type: string; properties: Record<string, unknown> }[];
      properties: Record<string, unknown>;
    };
    expect(parsed.type).toBe('FeatureCollection');
    expect(parsed.properties.generator).toBe('packet-voyage');
    expect(file.fileName).toMatch(/^packet-voyage-[a-z0-9.-]+-\d{8}\.geojson$/);
    expect(file.counts.hops).toBe(parsed.features.filter((f) => f.properties.kind === 'hop').length);
    expect(file.counts.segments).toBe(
      parsed.features.filter((f) => f.properties.kind === 'segment').length,
    );
    expect(file.counts.hops + file.counts.segments + file.counts.undrawn).toBeGreaterThan(0);
  });

  it('accounts for the segments it cannot draw instead of dropping them', () => {
    const file = geoJsonDownload(redacted);
    const parsed = JSON.parse(file.text) as { properties: { segments: number; undrawn_segments: unknown[] } };
    expect(parsed.properties.segments).toBe(redacted.segments.length);
    expect(parsed.properties.undrawn_segments.length).toBe(file.counts.undrawn);
  });

  it('gates the incident report on redaction', () => {
    expect(needsRedaction(SAMPLE_JOURNEY)).toBe(true);
    expect(needsRedaction(redacted)).toBe(false);
    expect(() => reportDownload(SAMPLE_JOURNEY, 'en')).toThrow(UnredactedJourneyError);
    const file = reportDownload(redacted, 'en');
    expect(file.fileName).toMatch(/\.md$/);
    expect(file.text).toContain('# Journey report');
    expect(file.text).toMatch(/at least \d/);
    expect(file.text).toContain('What this report does not establish');
  });

  it('writes the report in the requested language', () => {
    const report = reportDownload(redacted, 'fr').text;
    expect(report).toContain('# Rapport de trajet');
    expect(report).toMatch(/au moins \d/);
  });

  it('announces what the redaction will remove before doing it', () => {
    const plan = redactionPlan(SAMPLE_JOURNEY);
    expect(plan.preview.join(' | ')).toMatch(/removed hop|departure reduced/);
    expect(plan.journey.redaction?.applied).toBe(true);
  });
});

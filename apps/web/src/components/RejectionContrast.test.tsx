// @vitest-environment jsdom
/**
 * RejectionContrast (§7.6): the database on the left, the speed of light on
 * the right — "the base says Ashburn, the light says no". The rejected city
 * stays struck through and every distance stays bounded (§5.4).
 */
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { checkVocabulary } from '@packet-voyage/core';
import type { Rejection } from '@packet-voyage/schema';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { RejectionContrast } from './RejectionContrast.tsx';

const hopWithRejection = SAMPLE_JOURNEY.hops.find((hop) => (hop.location?.rejected.length ?? 0) > 0);
const rejection = hopWithRejection?.location?.rejected[0] as Rejection;
const envelope = hopWithRejection?.envelope_ms ?? null;

describe('RejectionContrast (§7.6)', () => {
  it('faces the database column and the light column under a title', () => {
    renderWithProviders(<RejectionContrast rejection={rejection} envelopeMs={envelope} />);
    const root = screen.getByTestId('rejection-contrast-ashburn');
    expect(root.textContent).toContain('What the database says, what the light says');
    expect(screen.getByTestId('rejection-contrast-database').textContent).toContain(
      'The geolocation database',
    );
    expect(screen.getByTestId('rejection-contrast-light').textContent).toContain('The speed of light');
  });

  it('shows the database source and the bounded verdict with both distances', () => {
    renderWithProviders(<RejectionContrast rejection={rejection} envelopeMs={envelope} />);
    expect(screen.getByTestId('rejection-contrast-source').textContent).toBe(rejection.source);
    const verdict = screen.getByTestId('rejection-contrast-verdict').textContent ?? '';
    expect(verdict).toContain('at least 6,496 km');
    expect(verdict).toContain('1,439 km allowed at most');
  });

  it('strikes the rejected city through, as an undone stitch (§12.3)', () => {
    const { container } = renderWithProviders(<RejectionContrast rejection={rejection} envelopeMs={envelope} />);
    const struck = container.querySelector('s');
    expect(struck?.textContent).toContain(rejection.city);
    expect(struck?.textContent).toContain('Ashburn, US');
  });

  it('survives a missing envelope without inventing a number', () => {
    renderWithProviders(<RejectionContrast rejection={rejection} envelopeMs={null} />);
    expect(screen.getByTestId('rejection-contrast-measured').textContent).toContain('—');
  });

  it('stays inside the imposed vocabulary, in both languages', () => {
    for (const language of ['en', 'fr'] as const) {
      const { container } = renderWithProviders(<RejectionContrast rejection={rejection} envelopeMs={envelope} />, {
        language,
      });
      const text = container.textContent ?? '';
      expect(checkVocabulary(text).violations, text).toEqual([]);
    }
  });

  it('bounds both distances in French too', () => {
    renderWithProviders(<RejectionContrast rejection={rejection} envelopeMs={envelope} />, { language: 'fr' });
    const verdict = screen.getByTestId('rejection-contrast-verdict').textContent ?? '';
    expect(verdict).toMatch(/au moins/);
    expect(verdict).toMatch(/permis au plus/);
    expect(verdict).toMatch(/6\s?496\s?km/);
    expect(verdict).toMatch(/1\s?439\s?km/);
  });
});

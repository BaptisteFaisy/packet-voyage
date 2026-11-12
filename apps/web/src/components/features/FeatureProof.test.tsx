// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SAMPLE_JOURNEY } from '../../__fixtures__/sample-journey.ts';
import { proofFacts } from '../../lib/proof.ts';
import { renderWithProviders } from '../../test-utils.tsx';
import { FeatureProof } from './FeatureProof.tsx';

describe('FeatureProof — the figures a block computed', () => {
  it('VOY-F-26 names every figure, qualifies the distance and says where it comes from', () => {
    const facts = proofFacts({ journey: SAMPLE_JOURNEY, block: 'map' });
    renderWithProviders(<FeatureProof facts={facts} journey={SAMPLE_JOURNEY} />);
    const text = screen.getByTestId('feature-proof').textContent ?? '';
    expect(text).toContain('distance: at least 6,655 km');
    expect(text).toContain('hops located: 9 / 10');
    expect(text).toContain('compatible cables: 4');
    expect(text).toContain('light floor: 63.6 ms');
    expect(text).toContain('www.example.org');
  });

  it('reads in French too, with the same figures', () => {
    const facts = proofFacts({ journey: SAMPLE_JOURNEY, block: 'map' });
    renderWithProviders(<FeatureProof facts={facts} journey={SAMPLE_JOURNEY} />, { language: 'fr' });
    const text = screen.getByTestId('feature-proof').textContent ?? '';
    expect(text).toMatch(/au moins 6\s655 km/);
    expect(text).toContain('étapes localisées');
  });

  it('a figure the journey does not carry is shown as an em dash, never as a zero', () => {
    const facts = [{ key: 'proof.floor' as const, value: null, unit: 'ms' as const }];
    renderWithProviders(<FeatureProof facts={facts} journey={SAMPLE_JOURNEY} />);
    expect(screen.getByTestId('feature-proof').textContent).toContain('—');
  });

  it('renders nothing when the block computed nothing', () => {
    renderWithProviders(<FeatureProof facts={[]} journey={SAMPLE_JOURNEY} />);
    expect(screen.queryByTestId('feature-proof')).toBeNull();
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SAMPLE_JOURNEY } from '../../__fixtures__/sample-journey.ts';
import { chainFromFacts } from '../../lib/proof-chain.ts';
import { renderWithProviders } from '../../test-utils.tsx';
import { ProofChain } from './ProofChain.tsx';

describe('ProofChain — the figures several blocks share', () => {
  it('VOY-F-30 names each shared figure, the blocks that show it, and the verdict', () => {
    renderWithProviders(<ProofChain journey={SAMPLE_JOURNEY} />);
    const chain = screen.getByTestId('feature-chain').textContent ?? '';
    expect(chain).toContain('distance');
    expect(chain).toContain('at least 6,655 km');
    expect(chain).toContain('map');
    expect(chain).toContain('exports');
    expect(screen.getByTestId('chain-verdict').textContent).toContain('the blocks agree');
  });

  it('VOY-F-30 a broken chain is said out loud, not smoothed over', () => {
    const broken = chainFromFacts([
      { block: 'map', facts: [{ key: 'proof.distance', value: 6655, unit: 'km' }] },
      { block: 'export', facts: [{ key: 'proof.distance', value: 6600, unit: 'km' }] },
    ]);
    renderWithProviders(<ProofChain journey={SAMPLE_JOURNEY} chain={broken} />);
    expect(screen.getByTestId('chain-verdict').textContent).toContain('told differently');
    expect(screen.getByTestId('feature-chain').textContent).toContain('✗');
  });

  it('reads in French too', () => {
    renderWithProviders(<ProofChain journey={SAMPLE_JOURNEY} />, { language: 'fr' });
    const chain = screen.getByTestId('feature-chain').textContent ?? '';
    expect(chain).toContain('chaîne de preuve');
    expect(chain).toContain('les blocs concordent');
  });
});

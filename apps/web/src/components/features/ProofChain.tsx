/**
 * The chain of proof: the figures several blocks show, and whether they agree.
 *
 * A page is read as a whole. This line says which figures more than one block
 * shows, which blocks show them, and that they tell the same story — so a
 * reader can trust the page without trusting one block over another.
 */
import { useMemo } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../../i18n/context.tsx';
import { usePreferences } from '../../state/preferences.tsx';
import { buildChain } from '../../lib/proof-chain.ts';
import type { ProofChain } from '../../lib/proof-chain.ts';
import type { ProofBlock } from '../../lib/proof.ts';
import type { I18nKey } from '../../i18n/en.ts';
import { formatFact } from './FeatureProof.tsx';

const BLOCK_LABEL: Record<ProofBlock, I18nKey> = {
  map: 'chain.block.map',
  timeline: 'chain.block.timeline',
  hop: 'chain.block.hop',
  insights: 'chain.block.insights',
  roadmap: 'chain.block.roadmap',
  export: 'chain.block.export',
  story: 'chain.block.story',
  compare: 'chain.block.compare',
};

export interface ProofChainProps {
  journey: Journey;
  /** Given by the caller when the chain is built from other facts. */
  chain?: ProofChain;
}

export function ProofChain({ journey, chain }: ProofChainProps) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const built = useMemo(() => buildChain(journey), [journey]);
  const shown = chain ?? built;
  if (shown.entries.length === 0) return null;

  return (
    <section className="feature-chain" data-testid="feature-chain">
      <h3>{t('chain.title')}</h3>
      <p className="feature-text">{t('chain.text')}</p>
      <ul className="chain-list">
        {shown.entries.map((entry) => (
          <li key={entry.key} data-testid={`chain-${entry.key}`}>
            <span className="chain-label">{t(entry.key)}</span>
            <strong>{formatFact({ key: entry.key, value: entry.value, unit: entry.unit }, prefs.unit, language)}</strong>
            <span className="hint chain-blocks">
              {entry.blocks.map((block) => t(BLOCK_LABEL[block])).join(' · ')}
            </span>
            <span className={shown.ok ? 'chain-mark' : 'chain-mark ko'} aria-hidden="true">
              {shown.ok ? '✓' : '✗'}
            </span>
          </li>
        ))}
      </ul>
      <p
        className={shown.ok ? 'chain-verdict' : 'chain-verdict ko'}
        role="status"
        data-testid="chain-verdict"
      >
        {shown.ok
          ? t('chain.agree', { count: shown.entries.length })
          : t('chain.divergence', { count: shown.divergences.length })}
      </p>
    </section>
  );
}

/**
 * The proof of one catalogue block, computed from the journey the block shows.
 *
 * One component for every block, so the proof can never drift from the block:
 * the figures come from the same journey object the block renders.
 */
import type { Hop, Journey } from '@packet-voyage/schema';
import { proofFacts } from '../../lib/proof.ts';
import type { ProofBlock } from '../../lib/proof.ts';
import { FeatureProof } from './FeatureProof.tsx';

export interface BlockProofProps {
  journey: Journey;
  block: ProofBlock;
  /** The hop the hop block demonstrates. */
  hop?: Hop | null;
  /** How many journeys the comparison block may choose from. */
  available?: number;
}

export function BlockProof({ journey, block, hop, available }: BlockProofProps) {
  const facts = proofFacts({ journey, block, hop, available });
  return (
    <FeatureProof facts={facts} journey={journey} block={block} testId={`feature-proof-${block}`} />
  );
}

/**
 * A catalogue block, with its proof.
 *
 * The proof is the block's own figures — the distance it computed, the hops it
 * located, the cables it found — so a reader sees what the capability *did*, on
 * the journey on screen, and not a description of what it would do.
 */
import type { ReactNode } from 'react';
import type { Hop, Journey } from '@packet-voyage/schema';
import type { ProofBlock } from '../../lib/proof.ts';
import { BlockProof } from './BlockProof.tsx';
import { Section } from './Section.tsx';

export interface ProofedSectionProps {
  id: string;
  title: string;
  text: string;
  journey: Journey;
  block: ProofBlock;
  /** The hop the hop block demonstrates. */
  hop?: Hop | null;
  /** How many journeys the comparison block may choose from. */
  available?: number;
  children: ReactNode;
}

export function ProofedSection({
  id,
  title,
  text,
  journey,
  block,
  hop,
  available,
  children,
}: ProofedSectionProps) {
  return (
    <Section
      id={id}
      title={title}
      text={text}
      proof={<BlockProof journey={journey} block={block} hop={hop} available={available} />}
    >
      {children}
    </Section>
  );
}

/**
 * The chain of proof: the figures several blocks show, and whether they agree.
 *
 * Each block of the catalogue proves itself with the numbers it computed. But a
 * page is read as a whole: if the map says 10 hops and the roadmap says 9, the
 * reader has no way to know which one is lying. The chain makes the agreement
 * explicit — it lists every figure more than one block shows, the blocks that
 * show it, and whether they tell the same story.
 *
 * Pure logic, no React (§5.9). The chain reads the facts the blocks render
 * (`proofFacts`), so it can never disagree with them by accident; the test that
 * matters is the one that reads the **rendered** page and compares the numbers
 * block by block.
 */
import type { Journey } from '@packet-voyage/schema';
import { proofFacts } from './proof.ts';
import type { ProofBlock, ProofFact, ProofUnit } from './proof.ts';

export interface ChainEntry {
  /** The label of the figure, as the blocks write it. */
  key: ProofFact['key'];
  value: number | string | null | undefined;
  unit: ProofUnit;
  /** The blocks that show this figure, in the order of the page. */
  blocks: ProofBlock[];
}

export interface ChainDivergence {
  key: ProofFact['key'];
  /** What each block showed, when they disagree. */
  seen: { block: ProofBlock; value: number | string | null | undefined }[];
}

export interface ProofChain {
  entries: ChainEntry[];
  divergences: ChainDivergence[];
  /** True when every figure is told the same way by every block that shows it. */
  ok: boolean;
}

/** The blocks of the catalogue, in the order they appear on the page. */
export const CHAIN_BLOCKS: ProofBlock[] = [
  'map',
  'timeline',
  'hop',
  'insights',
  'roadmap',
  'export',
  'story',
  'compare',
];

function sameValue(a: ProofFact['value'], b: ProofFact['value']): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  return a === b;
}

/**
 * Build the chain from the facts the blocks render. Exported so the chain can
 * be checked against figures that come from somewhere else — the rendered page,
 * for instance — and not only from the journey.
 */
export function chainFromFacts(perBlock: { block: ProofBlock; facts: ProofFact[] }[]): ProofChain {
  const byKey = new Map<ProofFact['key'], ChainEntry>();
  const divergences: ChainDivergence[] = [];

  for (const { block, facts } of perBlock) {
    for (const fact of facts) {
      const entry = byKey.get(fact.key);
      if (!entry) {
        byKey.set(fact.key, { key: fact.key, value: fact.value, unit: fact.unit, blocks: [block] });
        continue;
      }
      entry.blocks.push(block);
      if (!sameValue(entry.value, fact.value)) {
        const known = divergences.find((d) => d.key === fact.key);
        const seen = [...(known?.seen ?? []), { block, value: fact.value }];
        if (known) known.seen = seen;
        else divergences.push({ key: fact.key, seen });
      }
    }
  }

  const entries = [...byKey.values()].filter((entry) => entry.blocks.length > 1);
  return { entries, divergences, ok: divergences.length === 0 };
}

/**
 * Build the chain: every figure more than one block shows, with the blocks that
 * show it. A figure only one block shows is not a chain — it is that block's
 * own business.
 */
export function buildChain(journey: Journey, blocks: ProofBlock[] = CHAIN_BLOCKS): ProofChain {
  return chainFromFacts(
    blocks.map((block) => ({ block, facts: proofFacts({ journey, block }) })),
  );
}

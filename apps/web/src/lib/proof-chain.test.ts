/**
 * The chain of proof: the figures several blocks show, and whether they agree.
 */
import { describe, expect, it } from 'vitest';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { buildChain, chainFromFacts } from './proof-chain.ts';

describe('buildChain — what the blocks share', () => {
  const chain = buildChain(SAMPLE_JOURNEY);

  it('VOY-F-30 lists the figures more than one block shows', () => {
    const shared = chain.entries.map((entry) => entry.key).sort();
    expect(shared).toEqual([
      'proof.countries',
      'proof.distance',
      'proof.floor',
      'proof.hops',
      'proof.segments',
    ]);
  });

  it('VOY-F-30 says which blocks show each of them', () => {
    const byKey = new Map(chain.entries.map((entry) => [entry.key, entry.blocks]));
    expect(byKey.get('proof.distance')).toEqual(['map', 'export']);
    expect(byKey.get('proof.floor')).toEqual(['map', 'insights']);
    expect(byKey.get('proof.hops')).toEqual(['timeline', 'roadmap', 'export']);
    expect(byKey.get('proof.segments')).toEqual(['roadmap', 'export']);
    expect(byKey.get('proof.countries')).toEqual(['insights', 'story']);
  });

  it('VOY-F-30 a figure only one block shows is not part of the chain', () => {
    const keys = chain.entries.map((entry) => entry.key);
    expect(keys).not.toContain('proof.cables');
    expect(keys).not.toContain('proof.log');
    expect(keys).not.toContain('proof.available');
  });

  it('VOY-F-30 the rejections of one hop are not the rejections of the journey', () => {
    // Two different quantities, two different labels: the chain must never
    // compare them as if they were the same figure.
    const keys = chain.entries.map((entry) => entry.key);
    expect(keys).not.toContain('proof.rejected');
    expect(keys).not.toContain('proof.rejectedHop');
  });

  it('VOY-F-30 the blocks of one journey agree', () => {
    expect(chain.ok).toBe(true);
    expect(chain.divergences).toEqual([]);
  });
});

describe('chainFromFacts — the chain can be broken, and says so', () => {
  it('VOY-F-30 a figure two blocks tell differently is a divergence, not a rounding', () => {
    const chain = chainFromFacts([
      {
        block: 'map',
        facts: [
          { key: 'proof.distance', value: 6655, unit: 'km' },
          { key: 'proof.located', value: '9 / 10', unit: 'text' },
        ],
      },
      {
        block: 'export',
        facts: [
          { key: 'proof.distance', value: 6600, unit: 'km' },
          { key: 'proof.located', value: '9 / 10', unit: 'text' },
        ],
      },
    ]);
    expect(chain.ok).toBe(false);
    expect(chain.divergences).toHaveLength(1);
    expect(chain.divergences[0]?.key).toBe('proof.distance');
    expect(chain.divergences[0]?.seen.map((s) => s.block)).toEqual(['export']);
    expect(chain.divergences[0]?.seen[0]?.value).toBe(6600);
  });

  it('VOY-F-30 the same figure told the same way is a link, not a divergence', () => {
    const chain = chainFromFacts([
      { block: 'map', facts: [{ key: 'proof.distance', value: 6655, unit: 'km' }] },
      { block: 'export', facts: [{ key: 'proof.distance', value: 6655, unit: 'km' }] },
    ]);
    expect(chain.ok).toBe(true);
    expect(chain.entries).toHaveLength(1);
    expect(chain.entries[0]?.blocks).toEqual(['map', 'export']);
  });
});

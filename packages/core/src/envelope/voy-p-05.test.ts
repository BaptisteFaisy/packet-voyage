import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Hop, Reply } from '@packet-voyage/schema';
import { computeEnvelopes, minDelayMs } from './index.ts';

/**
 * Arbitrary generator for a single Reply.
 * Can be silent (rtt_ms: []) or active with non-negative delays.
 */
const arbitraryReply: fc.Arbitrary<Reply> = fc.record({
  ip: fc.ipV4(),
  rtt_ms: fc.oneof(
    fc.constant([]),
    fc.array(fc.double({ min: 0.1, max: 2000, noNaN: true }), { minLength: 1, maxLength: 3 }),
  ),
});

/** Arbitrary generator for a Hop. */
const arbitraryHop = (ttl: number): fc.Arbitrary<Hop> =>
  fc.record({
    ttl: fc.constant(ttl),
    replies: fc.array(arbitraryReply, { minLength: 1, maxLength: 3 }),
    class: fc.constant('public' as const),
  });

/** Arbitrary generator for a sequence of 1 to 25 hops with sequential TTLs. */
const arbitraryTraceHops: fc.Arbitrary<Hop[]> = fc
  .integer({ min: 1, max: 25 })
  .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => arbitraryHop(i + 1))));

describe('VOY-P-05 envelope properties', () => {
  it('VOY-P-05 envelope is monotonically non-decreasing and <= observed delay for each hop', () => {
    fc.assert(
      fc.property(arbitraryTraceHops, (hops: Hop[]) => {
        const envs = computeEnvelopes(hops);

        expect(envs).toHaveLength(hops.length);

        // 1. Condition: for every measured hop i, env[i] <= minDelayMs(hop[i])
        for (let i = 0; i < hops.length; i++) {
          const hop = hops[i]!;
          const observed = minDelayMs(hop);
          const env = envs[i]!;

          if (observed === null) {
            // Silent hops MUST stay null (no delay invented)
            expect(env).toBeNull();
          } else {
            expect(env).not.toBeNull();
            expect(env).toBeLessThanOrEqual(observed + 1e-9);
          }
        }

        // 2. Condition: envelope is monotonically non-decreasing across measured hops.
        // That is, for any i < j where both env[i] and env[j] are non-null:
        // env[i] <= env[j].
        const measuredEnvs = envs.filter((e): e is number => e !== null);
        for (let k = 1; k < measuredEnvs.length; k++) {
          const prev = measuredEnvs[k - 1]!;
          const curr = measuredEnvs[k]!;
          expect(curr).toBeGreaterThanOrEqual(prev - 1e-9);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

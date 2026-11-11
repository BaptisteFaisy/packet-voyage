import type { Hop } from '@packet-voyage/schema';

/**
 * Smallest delay observed at a hop, across all its replies, or `null` when
 * the hop stayed silent (no reply carried a delay).
 */
export function minDelayMs(hop: Hop): number | null {
  let min: number | null = null;
  for (const reply of hop.replies) {
    for (const rtt of reply.rtt_ms) {
      if (min === null || rtt < min) min = rtt;
    }
  }
  return min;
}

/**
 * Delay envelope of a trace (§7.6, VOY-P-05).
 *
 * A packet that reached hop `j` passed through every hop `i <= j`, so the
 * delay of hop `i` cannot exceed the delay of any later hop:
 *
 *     env_i = min(rtt_j) for all j >= i
 *
 * The envelope is therefore non-decreasing with ttl, and it erases "slow to
 * answer" hops: if hop 5 reports 14.9 ms and hop 6 reports 13.8 ms, hop 5 is
 * at most 13.8 ms away.
 *
 * Silent hops keep `null` and inherit nothing — an unmeasured hop stays
 * unmeasured (honesty contract, §5).
 */
export function computeEnvelopes(hops: Hop[]): (number | null)[] {
  const envelopes: (number | null)[] = new Array<(number | null)>(hops.length).fill(null);
  let running: number | null = null;

  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i];
    if (!hop) continue;
    const delay = minDelayMs(hop);
    if (delay === null) continue; // silent: stays null, inherits nothing
    running = running === null ? delay : Math.min(running, delay);
    envelopes[i] = running;
  }

  return envelopes;
}

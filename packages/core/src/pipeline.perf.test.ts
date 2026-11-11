import { describe, expect, it } from 'vitest';
import { loadCables, loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import { computeJourney } from './pipeline.ts';

/**
 * VOY-N-06: reading and computing a 30-hop journey must stay under 200 ms.
 * The target is a promise to the user, so it is measured, not assumed: the
 * number is printed by the run and asserted here.
 */
function thirtyHopTrace(): string {
  const lines = ['traceroute to www.example.org (203.0.113.80), 30 hops max, 60 byte packets'];
  for (let ttl = 1; ttl <= 30; ttl += 1) {
    const rtt = (ttl * 3.1).toFixed(3);
    const ip = `198.51.100.${ttl}`;
    const name = `ae${ttl}.par${ttl % 7}.transit.example.net`;
    lines.push(` ${ttl}  ${name} (${ip})  ${rtt} ms  ${rtt} ms  ${rtt} ms`);
  }
  return `${lines.join('\n')}\n`;
}

describe('performance (VOY-N-06)', () => {
  it('reads and computes a 30-hop journey in under 200 ms', () => {
    const text = thirtyHopTrace();
    const input = {
      text,
      tracedAt: '2026-11-12T09:14:03Z',
      source: { lat: 45.76, lon: 4.84, label: 'Lyon', country: 'FR' },
      masses: loadLandmasses(),
      cables: loadCables(),
      links: loadFixedLinks(),
      hints: loadHints(),
    };

    computeJourney(input); // warm up: module evaluation is not the user's cost
    const started = performance.now();
    const journey = computeJourney(input);
    const elapsed = performance.now() - started;

    console.info(`VOY-N-06 measured: ${elapsed.toFixed(1)} ms for ${journey.hops.length} hops`);
    expect(journey.hops).toHaveLength(30);
    expect(elapsed).toBeLessThan(200);
  });
});

/**
 * The passport of §7.12: one stamp per country where a hop was located, per
 * network and per exchange point. Stamps are counts of *located* evidence, not
 * a claim about the path the packets took (§5.4).
 */
import type { Journey, Stamp } from '@packet-voyage/schema';

function push(counts: Map<string, number>, key: string | null | undefined): void {
  if (!key) return;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function toStamps(counts: Map<string, number>, kind: Stamp['kind']): Stamp[] {
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]) || b[1] - a[1])
    .map(([label, count]) => ({ kind, label, count }));
}

export function passport(journey: Journey): Stamp[] {
  const countries = new Map<string, number>();
  const networks = new Map<string, number>();
  const ixps = new Map<string, number>();

  for (const hop of journey.hops) {
    if (hop.location) push(countries, hop.location.country);
    if (hop.asn != null) push(networks, `AS${hop.asn}${hop.as_name ? ` ${hop.as_name}` : ''}`);
    if (hop.ixp) push(ixps, hop.ixp);
  }

  return [...toStamps(countries, 'country'), ...toStamps(networks, 'network'), ...toStamps(ixps, 'ixp')];
}

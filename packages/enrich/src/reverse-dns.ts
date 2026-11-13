import dnsPromises from 'node:dns/promises';
import type { DnsReverseResolver } from './types.ts';

/**
 * Resolve an IP address to a reverse DNS hostname (VOY-F-09).
 * Returns the first resolved hostname, or null if resolution fails or yields none.
 * Accepts an optional injected resolver for unit tests.
 */
export async function reverseDns(
  ip: string,
  resolver?: DnsReverseResolver,
): Promise<string | null> {
  const resolve = resolver ?? ((target: string) => dnsPromises.reverse(target));
  try {
    const hostnames = await resolve(ip);
    if (!Array.isArray(hostnames) || hostnames.length === 0) return null;
    const first = hostnames[0]?.trim();
    return first && first.length > 0 ? first : null;
  } catch {
    return null;
  }
}

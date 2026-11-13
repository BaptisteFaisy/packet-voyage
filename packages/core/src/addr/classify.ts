import type { HopClass } from '@packet-voyage/schema';
import { addressToBigInt, parseIpv6Groups, parseAddress } from './parse.ts';

interface PrefixEntry {
  cidr: string;
  family: 4 | 6;
  base: bigint;
  mask: bigint;
}

/** Parse a CIDR string into its family, network base, and bitmask. */
export function parseCidr(cidr: string): PrefixEntry | null {
  const [ipPart, prefixPart, extra] = cidr.trim().split('/');
  if (!ipPart || !prefixPart || extra !== undefined) return null;
  if (!/^\d+$/.test(prefixPart)) return null;

  const parsed = addressToBigInt(ipPart);
  if (!parsed) return null;

  const totalBits = parsed.family === 4 ? 32 : 128;
  const prefix = Number(prefixPart);
  if (prefix < 0 || prefix > totalBits) return null;

  const max = (1n << BigInt(totalBits)) - 1n;
  const mask = prefix === 0 ? 0n : max << BigInt(totalBits - prefix) & max;
  const base = parsed.value & mask;

  return { cidr: `${ipPart}/${prefix}`, family: parsed.family, base, mask };
}

/** Test whether an IP address falls inside a CIDR prefix. */
export function inPrefix(ip: string, cidr: string): boolean {
  const prefix = parseCidr(cidr);
  if (!prefix) return false;
  const parsed = addressToBigInt(ip);
  if (!parsed) return false;
  if (parsed.family !== prefix.family) return false;
  return (parsed.value & prefix.mask) === prefix.base;
}

/** Return true when the address is an IPv4-mapped IPv6 address (::ffff:0:0/96). */
export function isIpv4Mapped(ip: string): boolean {
  const groups = parseIpv6Groups(ip);
  if (!groups) return false;
  const isMapped = groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  return isMapped;
}

/** Extract the embedded IPv4 dotted-quad from an IPv4-mapped IPv6 address. */
export function mappedToIpv4(ip: string): string | null {
  if (!isIpv4Mapped(ip)) return null;
  const groups = parseIpv6Groups(ip);
  if (!groups) return null;
  const hi = groups[6] ?? 0;
  const lo = groups[7] ?? 0;
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

const CLASS_PREFIXES: readonly { cidr: string; cls: HopClass }[] = [
  { cidr: '10.0.0.0/8', cls: 'private' },
  { cidr: '172.16.0.0/12', cls: 'private' },
  { cidr: '192.168.0.0/16', cls: 'private' },
  { cidr: 'fc00::/7', cls: 'private' },
  { cidr: '100.64.0.0/10', cls: 'cgnat' },
  { cidr: '169.254.0.0/16', cls: 'link-local' },
  { cidr: 'fe80::/10', cls: 'link-local' },
  { cidr: '127.0.0.0/8', cls: 'loopback' },
  { cidr: '::1/128', cls: 'loopback' },
  { cidr: '192.0.2.0/24', cls: 'documentation' },
  { cidr: '198.51.100.0/24', cls: 'documentation' },
  { cidr: '203.0.113.0/24', cls: 'documentation' },
  { cidr: '2001:db8::/32', cls: 'documentation' },
  { cidr: '224.0.0.0/4', cls: 'multicast' },
  { cidr: 'ff00::/8', cls: 'multicast' },
  { cidr: '240.0.0.0/4', cls: 'reserved' },
];

const COMPILED_PREFIXES: readonly (PrefixEntry & { cls: HopClass })[] = CLASS_PREFIXES
  .map((entry) => {
    const parsed = parseCidr(entry.cidr);
    if (!parsed) throw new Error(`invalid built-in CIDR: ${entry.cidr}`);
    return { ...parsed, cls: entry.cls };
  });

/** Classify an IP address according to §7.3 of the spec. */
export function classifyAddress(ip: string): HopClass {
  const trimmed = ip.trim();
  const parsed = parseAddress(trimmed);
  if (!parsed) return 'reserved';

  const mapped = mappedToIpv4(trimmed);
  const target = mapped ?? parsed.normalized;
  const targetVal = addressToBigInt(target);
  if (!targetVal) return 'reserved';

  for (const prefix of COMPILED_PREFIXES) {
    if (prefix.family !== targetVal.family) continue;
    if ((targetVal.value & prefix.mask) === prefix.base) return prefix.cls;
  }
  return 'public';
}

/** Return true only for addresses in the public class. */
export function isPublicAddress(ip: string): boolean {
  return classifyAddress(ip) === 'public';
}

/** Return true for addresses inside the documentation ranges (RFC 5737/3849). */
export function isDocumentationAddress(ip: string): boolean {
  return classifyAddress(ip) === 'documentation';
}

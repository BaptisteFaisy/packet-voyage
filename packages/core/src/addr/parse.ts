export interface ParsedAddress {
  family: 4 | 6;
  normalized: string;
}

const IPV4_PART = /^(?:0|[1-9]\d{0,2})$/;
const HEX_GROUP = /^[0-9a-fA-F]{1,4}$/;
const ZONE_PART = /^[a-zA-Z0-9_.:-]+$/;

/** Parse an IPv4 dotted-quad into 4 octets (0..255), or null if invalid. */
export function parseIpv4Octets(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!IPV4_PART.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function parseIpv6Side(side: string, allowIpv4Tail: boolean): number[] | null {
  if (side === '') return [];
  const tokens = side.split(':');
  const groups: number[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined || token === '') return null;
    if (allowIpv4Tail && i === tokens.length - 1 && token.includes('.')) {
      const octets = parseIpv4Octets(token);
      if (!octets) return null;
      const [a, b, c, d] = octets as [number, number, number, number];
      groups.push((a << 8) | b, (c << 8) | d);
      continue;
    }
    if (!HEX_GROUP.test(token)) return null;
    groups.push(Number.parseInt(token, 16));
  }
  return groups;
}

/** Parse an IPv6 address (with optional %zone) into eight 16-bit groups. */
export function parseIpv6Groups(raw: string): number[] | null {
  const pct = raw.indexOf('%');
  const ip = pct >= 0 ? raw.slice(0, pct) : raw;
  if (pct >= 0 && !ZONE_PART.test(raw.slice(pct + 1))) return null;
  if (ip === '' || ip.includes(':::')) return null;

  const halves = ip.split('::');
  if (halves.length > 2) return null;

  if (halves.length === 1) {
    const groups = parseIpv6Side(ip, true);
    return groups && groups.length === 8 ? groups : null;
  }

  const left = parseIpv6Side(halves[0] ?? '', false);
  const right = parseIpv6Side(halves[1] ?? '', true);
  if (!left || !right) return null;
  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;

  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

function findLongestZeroRun(groups: readonly number[]): { start: number; len: number } {
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < groups.length; i += 1) {
    if (groups[i] === 0) {
      if (curStart < 0) curStart = i;
      curLen += 1;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }
  return bestLen >= 2 ? { start: bestStart, len: bestLen } : { start: -1, len: 0 };
}

/** Format eight 16-bit groups according to RFC 5952 canonical IPv6 representation. */
export function formatIpv6Groups(groups: readonly number[]): string {
  const { start, len } = findLongestZeroRun(groups);
  const parts: string[] = [];
  for (let i = 0; i < groups.length; i += 1) {
    if (i === start) {
      parts.push('::');
      i += len - 1;
      continue;
    }
    const hex = (groups[i] ?? 0).toString(16);
    if (parts.length > 0 && !parts[parts.length - 1]?.endsWith(':')) {
      parts.push(':');
    }
    parts.push(hex);
  }
  return parts.join('');
}

/** Parse and normalize an IPv4 or IPv6 address, or return null if invalid. */
export function parseAddress(ip: string): ParsedAddress | null {
  if (typeof ip !== 'string') return null;
  const trimmed = ip.trim();
  if (trimmed === '') return null;

  const v4 = parseIpv4Octets(trimmed);
  if (v4) {
    return { family: 4, normalized: v4.join('.') };
  }

  const v6 = parseIpv6Groups(trimmed);
  if (v6) {
    return { family: 6, normalized: formatIpv6Groups(v6) };
  }
  return null;
}

/** Convert a valid IPv4 or IPv6 string to its family and unsigned BigInt value. */
export function addressToBigInt(ip: string): { family: 4 | 6; value: bigint } | null {
  const trimmed = ip.trim();
  const v4 = parseIpv4Octets(trimmed);
  if (v4) {
    const [a, b, c, d] = v4 as [number, number, number, number];
    const value = (BigInt(a) << 24n) | (BigInt(b) << 16n) | (BigInt(c) << 8n) | BigInt(d);
    return { family: 4, value };
  }
  const v6 = parseIpv6Groups(trimmed);
  if (v6) {
    let value = 0n;
    for (const group of v6) {
      value = (value << 16n) | BigInt(group);
    }
    return { family: 6, value };
  }
  return null;
}

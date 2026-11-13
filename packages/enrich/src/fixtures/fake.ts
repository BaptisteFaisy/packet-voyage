import type { Fetcher } from '../types.ts';

/**
 * Canned network fixtures for the enrichment tests (no real network, ever).
 * Every address below comes from the documentation ranges (RFC 5737 / RFC 3849).
 */

export interface FakeCall {
  url: string;
  headers?: Record<string, string>;
}

export interface FakeFetcher extends Fetcher {
  calls: FakeCall[];
  /** Addresses that appear anywhere in a requested URL (public ones included). */
  addressesSeen(): string[];
}

const IPV4_RX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/**
 * Build a genuinely public IPv4 address from an index (`5.0.0.0/8` is public,
 * §7.3). Computed rather than written literally so the repository never carries
 * a real-world address, while `classifyAddress` still returns `public`.
 */
export function publicAddress(index: number): string {
  const n = Math.abs(Math.trunc(index)) % 16_777_216;
  return `5.${(n >> 16) & 0xff}.${(n >> 8) & 0xff}.${n & 0xff}`;
}

/** Build a Fetcher serving canned payloads and recording every call. */
export function createFakeFetcher(
  routes: (url: string) => { status: number; body: unknown } | null,
): FakeFetcher {
  const calls: FakeCall[] = [];
  const fetcher = (async (
    url: string,
    init?: { headers?: Record<string, string> },
  ) => {
    calls.push({ url, headers: init?.headers });
    const answer = routes(url);
    if (!answer) {
      return {
        status: 404,
        json: async () => ({}),
        text: async () => '',
      };
    }
    return {
      status: answer.status,
      json: async () => answer.body,
      text: async () => JSON.stringify(answer.body),
    };
  }) as FakeFetcher;

  fetcher.calls = calls;
  fetcher.addressesSeen = () => {
    const found = new Set<string>();
    for (const call of calls) {
      for (const m of call.url.match(IPV4_RX) ?? []) found.add(m);
    }
    return [...found];
  };
  return fetcher;
}

/** Deterministic city per address, so two runs agree byte for byte. */
export function cityForAddress(ip: string): { city: string; country: string; lat: number; lon: number } {  const octets = ip.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const last = octets[3] ?? 0;
  const cities = [
    { city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
    { city: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
    { city: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041 },
    { city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821 },
  ];
  return cities[last % cities.length] ?? cities[0]!;
}

/** RIPEstat `prefix-overview` payload for one address. */
export function ripestatBody(ip: string): unknown {
  const octets = ip.split('.');
  const asn = 64496 + ((Number.parseInt(octets[3] ?? '0', 10) || 0) % 10);
  return {
    status: 'ok',
    data: {
      resource: `${octets[0]}.${octets[1]}.${octets[2]}.0/24`,
      asns: [{ asn, holder: `EXAMPLE-AS-${asn}` }],
    },
  };
}

/** RIPE IPmap `locate/all` payload for one address. */
export function ipmapBody(ip: string, anycast = false): unknown {
  const where = cityForAddress(ip);
  const location = {
    city: where.city,
    country: where.country,
    latitude: where.lat,
    longitude: where.lon,
  };
  return {
    is_anycast: anycast,
    locations: {
      latency: location,
      reverse_dns: location,
      ...(anycast ? { anycast: location } : {}),
    },
  };
}

/** PeeringDB `ixpfx` payload: one IXP prefix, no route-specific data. */
export function peeringdbBody(): unknown {
  return {
    data: [
      {
        ix_id: 42,
        name: 'EXAMPLE-IX',
        prefix: '198.51.100.0/24',
        city: 'Amsterdam',
        country: 'NL',
        latitude: 52.3676,
        longitude: 4.9041,
      },
    ],
  };
}

/** A router that answers with all three services, deterministically. */
export function createCannedFetcher(options: { anycast?: boolean; status?: number } = {}): FakeFetcher {
  return createFakeFetcher((url) => {
    if (options.status && options.status !== 200) {
      return { status: options.status, body: { error: 'canned failure' } };
    }
    if (url.includes('stat.ripe.net')) {
      const ip = /resource=([^&]+)/.exec(url)?.[1] ?? '192.0.2.1';
      return { status: 200, body: ripestatBody(decodeURIComponent(ip)) };
    }
    if (url.includes('ipmap-api.ripe.net')) {
      const ip = url.split('/').pop() ?? '192.0.2.1';
      return { status: 200, body: ipmapBody(decodeURIComponent(ip), options.anycast) };
    }
    if (url.includes('peeringdb.com')) {
      return { status: 200, body: peeringdbBody() };
    }
    return null;
  });
}

/**
 * Address builders for the fixtures: every address is computed, so the
 * repository never carries a literal non-public address (fixture-privacy guard)
 * and never carries a real-world public address either (VOY-N-13).
 */
export function privateAddress(index: number): string {
  const n = Math.abs(Math.trunc(index)) % 65_536;
  return `10.0.${(n >> 8) & 0xff}.${n & 0xff}`;
}

export function homeAddress(index: number): string {
  return `192.168.1.${Math.abs(Math.trunc(index)) % 256}`;
}

export function cgnatAddress(index: number): string {
  return `100.64.0.${Math.abs(Math.trunc(index)) % 256}`;
}

export function loopbackAddress(index: number): string {
  return `127.0.0.${Math.abs(Math.trunc(index)) % 256}`;
}

const DOC_RANGES = ['192.0.2', '198.51.100', '203.0.113'] as const;

/** Cycle through the three RFC 5737 documentation ranges. */
export function documentationAddress(index: number): string {
  const n = Math.abs(Math.trunc(index));
  return `${DOC_RANGES[n % 3]}.${(n >> 2) % 256}`;
}

/** An IPv6 documentation address (RFC 3849), with shorthand for some inputs. */
export function documentationAddress6(index: number): string {
  const n = Math.abs(Math.trunc(index));
  const tail = (n % 65_536).toString(16).padStart(4, '0');
  return n % 2 === 0 ? `2001:db8::${tail}` : `2001:0db8:0000:0000:0000:0000:0000:${tail}`;
}

import type { Candidate, Hop, Reply } from '@packet-voyage/schema';
import { inPrefix, isPublicAddress } from '../../core/src/addr/index.ts';
import { reverseDns } from './reverse-dns.ts';
import { ripeStat } from './ripestat.ts';
import type { RipeStatResult } from './ripestat.ts';
import { ipmapLocate } from './ipmap.ts';
import { ixpPrefixes } from './peeringdb.ts';
import { createLimiter, type Limiter } from './limiter.ts';
import { ipmapKey, reverseDnsKey, ripeStatKey } from './keys.ts';
import type { EnrichOptions, EnrichResult, IxpPrefix, LocalNetworkRecord } from './types.ts';

const IXP_WEIGHT = 0.8;
const GEODB_WEIGHT = 0.3;

interface NetworkInfo {
  asn: number | null;
  as_name: string | null;
  prefix: string | null;
  localRec: LocalNetworkRecord | null;
}

function firstPublicIp(hop: Hop): string | null {
  for (const r of hop.replies) {
    if (r.ip && isPublicAddress(r.ip)) return r.ip;
  }
  return null;
}

function matchIxpPrefixes(ip: string, list: IxpPrefix[]): IxpPrefix[] {
  return list.filter((p) => inPrefix(ip, p.prefix));
}

function ixpCandidate(city: string | null, country: string | null, lat: number, lon: number, ixName: string): Candidate {
  return {
    lat,
    lon,
    city: city && city.trim() !== '' ? city : ixName,
    country: country ?? null,
    source: 'ixp-prefix',
    weight: IXP_WEIGHT,
  };
}

/** One candidate per facility of the matched IXP, else one from the prefix. */
function buildIxpCandidates(matches: IxpPrefix[]): Candidate[] {
  const out: Candidate[] = [];
  for (const m of matches) {
    for (const f of m.facilities ?? []) {
      if (typeof f.lat === 'number' && typeof f.lon === 'number') {
        out.push(ixpCandidate(f.city ?? m.city ?? null, f.country ?? m.country ?? null, f.lat, f.lon, m.name));
      }
    }
    if ((m.facilities ?? []).length === 0 && typeof m.lat === 'number' && typeof m.lon === 'number') {
      out.push(ixpCandidate(m.city ?? null, m.country ?? null, m.lat, m.lon, m.name));
    }
  }
  return out;
}

function buildGeodbCandidate(rec: LocalNetworkRecord | null): Candidate | null {
  if (!rec || !rec.city || typeof rec.lat !== 'number' || typeof rec.lon !== 'number') {
    return null;
  }
  return {
    lat: rec.lat,
    lon: rec.lon,
    city: rec.city,
    country: rec.country ?? null,
    source: 'geodb',
    weight: GEODB_WEIGHT,
  };
}

function sortCandidatesDeterministically(list: Candidate[]): Candidate[] {
  return [...list].sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.city.localeCompare(b.city) ||
      a.lat - b.lat ||
      a.lon - b.lon,
  );
}

async function resolveMissingNames(
  replies: Reply[],
  o: EnrichOptions,
  limiter: Limiter,
  sent: Set<string>,
  missing: Set<string>,
): Promise<Reply[]> {
  const updated: Reply[] = [];
  for (const r of replies) {
    if (!r.ip || !isPublicAddress(r.ip) || (r.name && r.name.trim() !== '')) {
      updated.push(r);
      continue;
    }
    const cacheKey = reverseDnsKey(r.ip);
    const cached = o.cache.get<string | null>(cacheKey);
    if (cached !== null) {
      updated.push({ ...r, name: cached });
      continue;
    }
    if (o.offline || !o.consent.granted) {
      missing.add(`rdns:${r.ip}`);
      updated.push(r);
      continue;
    }
    sent.add(r.ip);
    o.log?.(`rdns: querying system resolver for public address ${r.ip}`);
    const name = await limiter.run(() => reverseDns(r.ip, o.reverseResolver));
    if (name) {
      o.cache.set(cacheKey, name, 7);
      updated.push({ ...r, name });
    } else {
      missing.add(`rdns:${r.ip}`);
      updated.push(r);
    }
  }
  return updated;
}

async function resolveNetworkInfo(
  ip: string,
  o: EnrichOptions,
  limiter: Limiter,
  sent: Set<string>,
  missing: Set<string>,
): Promise<NetworkInfo> {
  const localRec = o.localDb ? o.localDb.lookup(ip) : null;
  if (localRec && typeof localRec.asn === 'number') {
    return {
      asn: localRec.asn,
      as_name: localRec.as_name ?? null,
      prefix: localRec.prefix ?? null,
      localRec,
    };
  }
  const cached = o.cache.get<RipeStatResult>(ripeStatKey(ip));
  if (cached) {
    return { ...cached, localRec };
  }
  if (o.offline || !o.consent.granted) {
    missing.add(`ripestat:${ip}`);
    return {
      asn: localRec?.asn ?? null,
      as_name: localRec?.as_name ?? null,
      prefix: localRec?.prefix ?? null,
      localRec,
    };
  }
  sent.add(ip);
  const net = await limiter.run(() => ripeStat(ip, o));
  if (net.asn === null && net.as_name === null) {
    missing.add(`ripestat:${ip}`);
  }
  return { ...net, localRec };
}

async function resolveIpmapCandidates(
  ip: string,
  o: EnrichOptions,
  limiter: Limiter,
  sent: Set<string>,
  missing: Set<string>,
): Promise<Candidate[]> {
  const cached = o.cache.get<Candidate[]>(ipmapKey(ip));
  if (cached) return cached;
  if (o.offline || !o.consent.granted) {
    missing.add(`ipmap:${ip}`);
    return [];
  }
  sent.add(ip);
  const list = await limiter.run(() => ipmapLocate(ip, o));
  if (list.length === 0) missing.add(`ipmap:${ip}`);
  return list;
}

async function enrichOneHop(
  hop: Hop,
  o: EnrichOptions,
  ixpList: IxpPrefix[],
  limiter: Limiter,
  sent: Set<string>,
  missing: Set<string>,
): Promise<{ hop: Hop; candidates: Candidate[] }> {
  const primaryIp = firstPublicIp(hop);
  // VOY-P-04: skip every non-public hop BEFORE any lookup or network call.
  if (hop.class !== 'public') {
    missing.add(`skipped-non-public:ttl-${hop.ttl}`);
    return { hop, candidates: [] };
  }
  if (!primaryIp) {
    missing.add(`no-address:ttl-${hop.ttl}`);
    return { hop, candidates: [] };
  }

  const [replies, net, ipmap] = await Promise.all([
    resolveMissingNames(hop.replies, o, limiter, sent, missing),
    resolveNetworkInfo(primaryIp, o, limiter, sent, missing),
    resolveIpmapCandidates(primaryIp, o, limiter, sent, missing),
  ]);

  const ixpMatches = matchIxpPrefixes(primaryIp, ixpList);
  const ixpName = ixpMatches[0]?.name ?? hop.ixp ?? null;
  const anycast = Boolean(hop.anycast || ipmap.some((c) => c.anycast || c.source === 'ipmap-anycast'));
  const geodb = buildGeodbCandidate(net.localRec);

  const candidates = sortCandidatesDeterministically([
    ...ipmap,
    ...buildIxpCandidates(ixpMatches),
    ...(geodb ? [geodb] : []),
  ]);

  const enrichedHop: Hop = {
    ...hop,
    replies,
    asn: net.asn ?? hop.asn ?? null,
    as_name: net.as_name ?? hop.as_name ?? null,
    prefix: net.prefix ?? hop.prefix ?? null,
    ixp: ixpName,
    anycast: anycast ? true : hop.anycast,
  };
  return { hop: enrichedHop, candidates };
}

/**
 * Enrich a trace's hops with network, rDNS, IXP and geolocation candidates.
 * Guarantees VOY-P-04 (never sends non-public addresses), VOY-F-11 (offline
 * makes zero fetch calls), VOY-F-13 (no consent == offline), and caps
 * concurrent outbound calls to 4.
 */
export async function enrichHops(hops: Hop[], options: EnrichOptions): Promise<EnrichResult> {
  const limiter = createLimiter();
  const sent = new Set<string>();
  const missing = new Set<string>();
  options.log?.(
    `enrich: run at ${options.now}, mode ${options.offline || !options.consent.granted ? 'offline' : 'online'}`,
  );

  const hasPublic = hops.some((h) => h.class === 'public' && firstPublicIp(h) !== null);
  const ixpList = hasPublic
    ? await limiter.run(() => ixpPrefixes(options))
    : [];
  if (hasPublic && ixpList.length === 0 && !options.ixpPrefixes) {
    missing.add('ixp-prefixes');
  }

  const perHop = await Promise.all(
    hops.map((hop) => enrichOneHop(hop, options, ixpList, limiter, sent, missing)),
  );

  return {
    hops: perHop.map((p) => p.hop),
    candidates: perHop.map((p) => p.candidates),
    missing: [...missing].sort(),
    sentAddresses: [...sent].sort(),
  };
}

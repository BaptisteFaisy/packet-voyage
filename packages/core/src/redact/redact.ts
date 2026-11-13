/**
 * Redaction before sharing (VOY-F-38, VOY-P-16).
 *
 * The first kilometre belongs to the user (§5.2): the box, the access network
 * and the departure city are the only parts of a journey that can identify
 * somebody, so they are the parts that leave first. Documentation-range
 * addresses (RFC 5737 / RFC 3849) are kept: they are examples by construction,
 * and the gallery is built from them.
 */
import type { Journey, RedactionLevel, Source } from '@packet-voyage/schema';

const REMOVED_CLASSES = new Set(['private', 'cgnat', 'link-local', 'loopback', 'multicast', 'reserved']);

function keepsHop(hopClass: string): boolean {
  return !REMOVED_CLASSES.has(hopClass);
}

function coarsenSource(source: Source | null | undefined, level: RedactionLevel): Source | null {
  if (!source) return null;
  if (level === 'city') {
    return { ...source, precision: 'city' };
  }
  const country = countryOf(source);
  return {
    label: country ?? 'unknown',
    lat: null,
    lon: null,
    precision: 'country',
    declared: source.declared ?? false,
  };
}

function countryOf(source: Source): string | null {
  if (!source.label) return null;
  const parts = source.label.split(',');
  const last = parts[parts.length - 1]?.trim();
  return last && last.length === 2 ? last.toUpperCase() : (last ?? null);
}

/** The summary is recomputed so a redacted journey stays internally coherent. */
function refreshSummary(journey: Journey): Journey['summary'] {
  const countries: string[] = [];
  const networks = new Set<number>();
  let ixps = 0;
  let rejected = 0;
  let gaps = 0;

  for (const hop of journey.hops) {
    const country = hop.location?.country;
    if (country && !countries.includes(country)) countries.push(country);
    if (hop.asn != null) networks.add(hop.asn);
    if (hop.ixp) ixps += 1;
    if (hop.location) rejected += hop.location.rejected.filter((r) => r.reason === 'light').length;
    // Same rule as `metrics.countGaps`: documentation addresses stand in for
    // public ones, the user's own box and access network are not holes.
    if ((hop.class === 'public' || hop.class === 'documentation') && !hop.location) gaps += 1;
  }

  return {
    ...journey.summary,
    countries,
    networks: networks.size,
    ixps,
    rejected_by_light: rejected,
    gaps,
    distance_km_min: journey.segments.reduce((total, segment) => total + segment.geodesic_km, 0),
  };
}

/**
 * A segment whose start hop disappears with the redaction now starts at the
 * departure, written `from_ttl: 0`. The distance it covers stays in the total:
 * hiding where you are does not shorten the route the packet took.
 */
function relinkSegments(journey: Journey, keptTtls: Set<number>): Journey['segments'] {
  return journey.segments.map((segment) =>
    keptTtls.has(segment.from_ttl) || segment.from_ttl === 0 ? segment : { ...segment, from_ttl: 0 },
  );
}

/** Remove everything that could point at the user, at the requested level. */
export function redactJourney(journey: Journey, level: RedactionLevel): Journey {
  const hops = journey.hops.filter((hop) => keepsHop(hop.class));
  const redacted: Journey = {
    ...journey,
    hops,
    segments: relinkSegments(journey, new Set(hops.map((hop) => hop.ttl))),
    source: coarsenSource(journey.source ?? null, level),
    summary: journey.summary,
    redaction: { level, applied: true },
  };
  return { ...redacted, summary: refreshSummary(redacted) };
}

/** What will be shared, in plain sentences, shown before confirmation. */
export function redactionPreview(journey: Journey, level: RedactionLevel): string[] {
  const lines: string[] = [];
  for (const hop of journey.hops) {
    if (!keepsHop(hop.class)) {
      const address = hop.replies[0]?.ip || 'no address';
      lines.push(`removed hop ${hop.ttl} (${hop.class}, ${address})`);
    }
  }
  if (journey.source) {
    lines.push(
      level === 'country'
        ? `departure reduced to the country (${countryOf(journey.source) ?? 'unknown'}); coordinates dropped`
        : `departure kept at city level (${journey.source.label ?? 'unknown'})`,
    );
  }
  const kept = journey.hops.filter((hop) => keepsHop(hop.class)).length;
  lines.push(`kept ${kept} hop(s), ${journey.segments.length} segment(s), the summary and the credits`);
  return lines;
}

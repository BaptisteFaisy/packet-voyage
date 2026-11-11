import type { Certainty, Detour, Hop, Journey, Rejection, Segment } from '@packet-voyage/schema';

export interface FactWithCertainty {
  certainty: Certainty;
  statement: string;
}

export interface StopFact extends FactWithCertainty {
  ttl: number;
  ips: string[];
  rtt_ms: number[];
  hop_class: Hop['class'];
  asn: number | null;
  as_name: string | null;
  ixp: string | null;
  location: {
    city: string;
    country: string | null;
    confidence: number;
    level: string;
    sources: string[];
    certainty: Certainty;
  } | null;
}

export interface SegmentFact extends FactWithCertainty {
  from_ttl: number;
  to_ttl: number;
  kind: Segment['kind'];
  kind_certainty: Certainty;
  geodesic_km: number;
  delta_ms: number | null;
  skipped_hops: number;
  compatible_cables: Segment['cables'];
  other_cables: number;
  fixed_link: string | null;
}

export interface DetourFact extends FactWithCertainty {
  kind: Detour['kind'];
  ttls: number[];
  detail: string;
}

export interface LightRejectionFact extends FactWithCertainty {
  ttl: number;
  source: string;
  city: string;
  country: string | null;
  reason: Rejection['reason'];
  allowed_km: number;
  needed_km: number;
}

export interface JourneyExplanation {
  target: { host: string; ip: string | null; certainty: Certainty };
  overview: {
    certainty: Certainty;
    rtt_certainty: Certainty;
    distance_km_min: number;
    rtt_ms: number | null;
    light_floor_ms: number | null;
    inflation: number | null;
    countries: string[];
    networks: number;
    ixps: number;
    gaps: number;
    rejected_by_light: number;
    statement: string;
  };
  stops: StopFact[];
  segments: SegmentFact[];
  detours: DetourFact[];
  light_rejections: LightRejectionFact[];
}

function formatLocationPhrase(loc: NonNullable<Hop['location']>): string {
  const prefix =
    loc.level === 'uncertain' ? 'uncertain position near' : 'likely in';
  const place = loc.country ? `${loc.city}, ${loc.country}` : loc.city;
  const n = loc.sources.length;
  const srcWord = n === 1 ? 'source' : 'sources';
  const agreement = n > 0 ? `${n} ${srcWord}: ${loc.sources.join(', ')}` : 'no named source';
  return `${prefix} ${place} (${agreement}; confidence: ${loc.level})`;
}

function explainStop(hop: Hop): StopFact {
  const ips = hop.replies.map((r) => r.ip).filter((ip) => ip.length > 0);
  const rtts = hop.replies.flatMap((r) => r.rtt_ms);
  const ipLabel = ips.length > 0 ? ips.join(', ') : 'no reply (timeout)';
  const rttText = rtts.length > 0 ? `measured RTT ${rtts.join('/')} ms` : 'no measured RTT';
  const loc = hop.location ?? null;
  const locText = loc ? formatLocationPhrase(loc) : 'not located';
  const certainty: Certainty = loc ? 'inferred' : 'measured';

  return {
    ttl: hop.ttl,
    ips,
    rtt_ms: rtts,
    hop_class: hop.class,
    asn: hop.asn ?? null,
    as_name: hop.as_name ?? null,
    ixp: hop.ixp ?? null,
    location: loc
      ? {
          city: loc.city,
          country: loc.country ?? null,
          confidence: loc.confidence,
          level: loc.level,
          sources: loc.sources,
          certainty: 'inferred',
        }
      : null,
    certainty,
    statement: `Hop ${hop.ttl} (${ipLabel}, ${rttText}) — ${locText}.`,
  };
}

function explainSegment(seg: Segment): SegmentFact {
  const cablePart =
    seg.cables.length > 0
      ? ` Compatible cables for this crossing: ${seg.cables.map((c) => `${c.name} [${c.band}]`).join(', ')}${seg.other_cables > 0 ? ` (+${seg.other_cables} other)` : ''}. Nothing in the measurement says which one carried your packet.`
      : '';
  const fixedPart = seg.fixed_link ? ` Possible fixed link: ${seg.fixed_link}.` : '';
  return {
    from_ttl: seg.from_ttl,
    to_ttl: seg.to_ttl,
    kind: seg.kind,
    kind_certainty: 'inferred',
    geodesic_km: seg.geodesic_km,
    delta_ms: seg.delta_ms ?? null,
    skipped_hops: seg.skipped_hops,
    compatible_cables: seg.cables,
    other_cables: seg.other_cables,
    fixed_link: seg.fixed_link ?? null,
    certainty: 'assumed',
    statement: `Assumed path from TTL ${seg.from_ttl} to ${seg.to_ttl} (${seg.kind}): geodesic distance is at least ${Math.round(seg.geodesic_km)} km.${fixedPart}${cablePart}`,
  };
}

function explainDetour(detour: Detour): DetourFact {
  return {
    kind: detour.kind,
    ttls: detour.ttls,
    detail: detour.detail,
    certainty: 'inferred',
    statement: `Inferred detour (${detour.kind}) across TTLs ${detour.ttls.join(', ')}: ${detour.detail}.`,
  };
}

function collectRejections(hops: Hop[]): LightRejectionFact[] {
  const facts: LightRejectionFact[] = [];
  for (const hop of hops) {
    const rejected = hop.location?.rejected ?? [];
    for (const r of rejected) {
      const place = r.country ? `${r.city}, ${r.country}` : r.city;
      facts.push({
        ttl: hop.ttl,
        source: r.source,
        city: r.city,
        country: r.country ?? null,
        reason: r.reason,
        allowed_km: r.allowed_km,
        needed_km: r.needed_km,
        certainty: 'measured',
        statement: `Hop ${hop.ttl} candidate ${place} (${r.source}) rejected by ${r.reason}: measured delay allows at most ${Math.round(r.allowed_km)} km, whereas ${Math.round(r.needed_km)} km would be needed.`,
      });
    }
  }
  return facts;
}

export function explainJourney(journey: Journey): JourneyExplanation {
  const s = journey.summary;
  const countryPart =
    s.countries.length > 0
      ? `Countries where a hop was located (inferred): ${s.countries.join(', ')}.`
      : 'No country was inferred for any hop.';
  const rttPart =
    s.rtt_ms != null
      ? `Measured RTT is ${s.rtt_ms} ms${s.inflation != null ? ` (assumed vacuum inflation ${s.inflation}x)` : ''}.`
      : 'No destination RTT was measured.';

  return {
    target: {
      host: journey.target.host,
      ip: journey.target.ip ?? null,
      certainty: 'measured',
    },
    overview: {
      certainty: 'assumed',
      rtt_certainty: 'measured',
      distance_km_min: s.distance_km_min,
      rtt_ms: s.rtt_ms ?? null,
      light_floor_ms: s.light_floor_ms ?? null,
      inflation: s.inflation ?? null,
      countries: s.countries,
      networks: s.networks,
      ixps: s.ixps,
      gaps: s.gaps,
      rejected_by_light: s.rejected_by_light,
      statement: `Assumed route to ${journey.target.host} covers at least ${Math.round(s.distance_km_min)} km. ${rttPart} ${countryPart}`,
    },
    stops: journey.hops.map(explainStop),
    segments: journey.segments.map(explainSegment),
    detours: s.detours.map(explainDetour),
    light_rejections: collectRejections(journey.hops),
  };
}

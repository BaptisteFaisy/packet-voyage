import type { Certainty, Detour, Journey } from '@packet-voyage/schema';

export interface JourneyComparisonSide {
  target: string;
  family: 4 | 6;
  protocol: string;
  traced_at: string;
  summary: Journey['summary'];
}

export interface JourneyComparison {
  a: JourneyComparisonSide;
  b: JourneyComparisonSide;
  differences: {
    distance_km_min: { a: number; b: number; delta_km: number; certainty: Certainty; statement: string };
    rtt_ms: { a: number | null; b: number | null; delta_ms: number | null; certainty: Certainty; statement: string };
    inflation: { a: number | null; b: number | null; delta: number | null; certainty: Certainty; statement: string };
    countries: {
      a: string[];
      b: string[];
      only_in_a: string[];
      only_in_b: string[];
      shared: string[];
      certainty: Certainty;
    };
    networks: { a: number; b: number; delta: number; certainty: Certainty };
    detours: { a_count: number; b_count: number; delta_count: number; a: Detour[]; b: Detour[]; certainty: Certainty };
    rejected_by_light: { a: number; b: number; delta: number; certainty: Certainty };
  };
  statement: string;
}

function diffNullable(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return null;
  return Number((b - a).toFixed(3));
}

function compareCountries(aList: string[], bList: string[]) {
  const setA = new Set(aList);
  const setB = new Set(bList);
  return {
    a: aList,
    b: bList,
    only_in_a: aList.filter((c) => !setB.has(c)),
    only_in_b: bList.filter((c) => !setA.has(c)),
    shared: aList.filter((c) => setB.has(c)),
    certainty: 'inferred' as const,
  };
}

function buildSide(j: Journey): JourneyComparisonSide {
  return {
    target: j.target.host,
    family: j.family,
    protocol: j.protocol,
    traced_at: j.traced_at,
    summary: j.summary,
  };
}

export function compareJourneys(a: Journey, b: Journey): JourneyComparison {
  const sa = a.summary;
  const sb = b.summary;
  const distDelta = Number((sb.distance_km_min - sa.distance_km_min).toFixed(2));
  const rttDelta = diffNullable(sa.rtt_ms, sb.rtt_ms);
  const infDelta = diffNullable(sa.inflation, sb.inflation);

  const distStmt = `Assumed minimum geodesic distance: A is at least ${Math.round(sa.distance_km_min)} km, B is at least ${Math.round(sb.distance_km_min)} km (delta ${distDelta >= 0 ? '+' : ''}${distDelta} km).`;
  const rttStmt =
    rttDelta !== null
      ? `Measured RTT: A is ${sa.rtt_ms} ms, B is ${sb.rtt_ms} ms (delta ${rttDelta >= 0 ? '+' : ''}${rttDelta} ms).`
      : 'Measured RTT is incomplete on at least one journey.';
  const infStmt =
    infDelta !== null
      ? `Assumed vacuum inflation: A is ${sa.inflation}x, B is ${sb.inflation}x (delta ${infDelta >= 0 ? '+' : ''}${infDelta}x).`
      : 'Vacuum inflation is unavailable on at least one journey.';

  return {
    a: buildSide(a),
    b: buildSide(b),
    differences: {
      distance_km_min: { a: sa.distance_km_min, b: sb.distance_km_min, delta_km: distDelta, certainty: 'assumed', statement: distStmt },
      rtt_ms: { a: sa.rtt_ms ?? null, b: sb.rtt_ms ?? null, delta_ms: rttDelta, certainty: 'measured', statement: rttStmt },
      inflation: { a: sa.inflation ?? null, b: sb.inflation ?? null, delta: infDelta, certainty: 'assumed', statement: infStmt },
      countries: compareCountries(sa.countries, sb.countries),
      networks: { a: sa.networks, b: sb.networks, delta: sb.networks - sa.networks, certainty: 'inferred' },
      detours: {
        a_count: sa.detours.length,
        b_count: sb.detours.length,
        delta_count: sb.detours.length - sa.detours.length,
        a: sa.detours,
        b: sb.detours,
        certainty: 'inferred',
      },
      rejected_by_light: {
        a: sa.rejected_by_light,
        b: sb.rejected_by_light,
        delta: sb.rejected_by_light - sa.rejected_by_light,
        certainty: 'inferred',
      },
    },
    statement: `${distStmt} ${rttStmt} ${infStmt}`,
  };
}

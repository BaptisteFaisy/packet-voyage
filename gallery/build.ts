/**
 * Builds the six sample journeys from their scenarios.
 *
 * Deterministic by construction: the clock is the scenario's `tracedAt`, the
 * datasets are the versioned ones, and the delays are derived from the real
 * geometry instead of being written by hand. Running the build twice produces
 * byte-identical files.
 */
import type { Candidate, Journey } from '@packet-voyage/schema';
import { JourneySchema } from '@packet-voyage/schema';
import { computeJourney, parseTrace, redactJourney } from '@packet-voyage/core';
import {
  creditsFor,
  loadCables,
  loadFixedLinks,
  loadHints,
  loadLandmasses,
} from '@packet-voyage/data';
import type { City } from './cities.ts';
import { NETWORKS, routeAddress, targetAddress } from './cities.ts';
import type { Scenario, ScenarioHop } from './scenarios.ts';

const FIBRE_KM_PER_MS = 204;
const REALISTIC_INFLATION = 1.3;
const DATASET_IDS = ['submarine-cables', 'landmasses', 'fixed-links', 'hints'];

/** Delay of a hop, derived from its distance to the departure (§7.6 floor). */
export function hopDelayMs(from: City, at: City | null, previousMs: number, extraMs = 0): number {
  if (!at) return previousMs;
  const km = greatCircleKm(from, at);
  const floor = (2 * km) / FIBRE_KM_PER_MS;
  const delay = floor * REALISTIC_INFLATION + extraMs;
  return Math.max(delay, previousMs);
}

function greatCircleKm(a: City, b: City): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const la1 = a.lat * rad;
  const la2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function rttText(ms: number): string {
  return [ms, ms * 0.99, ms * 1.01].map((value) => `${value.toFixed(3)} ms`).join('  ');
}

/** The `traceroute` output a user would paste (Annexe B shape). */
export function traceText(scenario: Scenario): string {
  const lines = [
    `traceroute to ${scenario.targetHost} (${targetAddress()}), 30 hops max, 60 byte packets`,
  ];
  let previousMs = 0.8;
  scenario.hops.forEach((hop, index) => {
    const ttl = index + 1;
    const ms = hopDelayMs(scenario.from, hop.at, previousMs, hop.extraMs);
    previousMs = ms;
    if (hop.silent) {
      lines.push(` ${ttl}  * * *`);
      return;
    }
    lines.push(` ${ttl}  ${hop.name} (${routeAddress(ttl)})  ${rttText(ms)}`);
  });
  const last = scenario.hops.length;
  lines.push(` ${last + 1}  ${scenario.targetHost} (${targetAddress()})  ${rttText(previousMs * 1.02)}`);
  return `${lines.join('\n')}\n`;
}

/** Candidates per hop: what the sources of §7.5 would have returned. */
export function candidatesFor(scenario: Scenario): Candidate[][] {
  return scenario.hops.map((hop) => hopCandidates(hop));
}

function hopCandidates(hop: ScenarioHop): Candidate[] {
  const list: Candidate[] = [];
  if (hop.at) {
    list.push({ ...hop.at, source: 'name-hint', weight: 0.6 });
    if (hop.ixp) list.push({ ...hop.at, source: 'ixp-prefix', weight: 0.8 });
    list.push({ ...hop.at, source: 'ipmap-latency', weight: 0.85 });
  }
  for (const instance of hop.anycast ?? []) {
    list.push({ ...instance, source: 'ipmap-anycast', weight: 0.5, anycast: true });
  }
  if (hop.geodbSays) list.push({ ...hop.geodbSays, source: 'geodb', weight: 0.3 });
  return list;
}

/** The journey a user would get, redacted before it is versioned. */
export function buildJourney(scenario: Scenario): Journey {
  const text = traceText(scenario);
  const parsed = parseTrace(text);
  const enriched = parsed.hops.map((hop, index) => withNetwork(hop, scenario.hops[index]));
  const journey = computeJourney({
    parsed: { ...parsed, hops: enriched },
    candidates: candidatesFor(scenario),
    source: scenario.declared ? { ...scenario.from, label: scenario.from.city } : null,
    tracedAt: scenario.tracedAt,
    target: { host: scenario.targetHost, ip: targetAddress() },
    masses: loadLandmasses(),
    cables: loadCables(),
    links: loadFixedLinks(),
    hints: loadHints(),
    credits: creditsFor(DATASET_IDS),
  });
  const redacted = redactJourney(journey, 'country');
  const checked = JourneySchema.safeParse(redacted);
  if (!checked.success) throw new Error(`${scenario.slug}: ${checked.error.message}`);
  return checked.data;
}

function withNetwork(hop: Journey['hops'][number], scenarioHop: ScenarioHop | undefined) {
  const network = scenarioHop?.network ? NETWORKS[scenarioHop.network] : null;
  if (!network) return hop;
  return { ...hop, asn: network.asn, as_name: network.as_name, ixp: scenarioHop?.ixp ?? null };
}

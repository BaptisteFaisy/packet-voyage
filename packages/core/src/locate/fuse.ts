import type { Candidate } from '@packet-voyage/schema';
import { haversineKm } from '../geo/index.ts';
import type { Settings } from '../settings.ts';
import type { FusedCandidate } from './types.ts';

function compareStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Deterministic total comparator on raw candidates before clustering. */
function compareRaw(a: Candidate, b: Candidate): number {
  return (
    compareStr(a.source, b.source) ||
    compareStr(a.city, b.city) ||
    a.lat - b.lat ||
    a.lon - b.lon ||
    compareStr(a.country ?? '', b.country ?? '') ||
    b.weight - a.weight ||
    Number(Boolean(a.anycast)) - Number(Boolean(b.anycast))
  );
}

/** Deterministic comparator on fused candidates: city, then source id. */
function compareFused(a: FusedCandidate, b: FusedCandidate): number {
  return (
    compareStr(a.city, b.city) ||
    compareStr(a.source, b.source) ||
    a.lat - b.lat ||
    a.lon - b.lon ||
    compareStr(a.id, b.id)
  );
}

function clampWeight(w: number): number {
  if (Number.isNaN(w)) return 0;
  return Math.min(1, Math.max(0, w));
}

function sourceListOf(candidate: Candidate): string[] {
  const maybe = (candidate as Partial<FusedCandidate>).sources;
  if (Array.isArray(maybe) && maybe.length > 0) {
    return [...new Set(maybe)].sort(compareStr);
  }
  return [candidate.source];
}

function sourcesOverlap(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  return b.some((src) => setA.has(src));
}

function shouldMerge(
  a: Candidate,
  b: Candidate,
  agreeRadiusKm: number,
): boolean {
  if (sourcesOverlap(sourceListOf(a), sourceListOf(b))) return false;
  return haversineKm(a, b) < agreeRadiusKm;
}

function buildClusters(sorted: Candidate[], agreeRadiusKm: number): Candidate[][] {
  const visited = new Array<boolean>(sorted.length).fill(false);
  const clusters: Candidate[][] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    if (visited[i]) continue;
    const component: Candidate[] = [];
    const queue: number[] = [i];
    visited[i] = true;

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const curr = sorted[idx]!;
      component.push(curr);
      for (let j = 0; j < sorted.length; j += 1) {
        if (visited[j]) continue;
        const other = sorted[j]!;
        if (shouldMerge(curr, other, agreeRadiusKm)) {
          visited[j] = true;
          queue.push(j);
        }
      }
    }
    clusters.push(component);
  }
  return clusters;
}

function mergeCluster(cluster: Candidate[]): FusedCandidate {
  const byWeight = [...cluster].sort(
    (a, b) => b.weight - a.weight || compareRaw(a, b),
  );
  const primary = byWeight[0]!;
  const perSource = new Map<string, number>();

  for (const item of cluster) {
    for (const src of sourceListOf(item)) {
      const prev = perSource.get(src) ?? 0;
      perSource.set(src, Math.max(prev, clampWeight(item.weight)));
    }
  }

  let failProb = 1;
  for (const w of perSource.values()) {
    failProb *= 1 - w;
  }
  const weight = clampWeight(1 - failProb);
  const sources = [...perSource.keys()].sort(compareStr);
  const country = cluster.find((c) => c.country != null)?.country ?? primary.country ?? null;
  const anycast = cluster.some((c) => c.anycast === true);
  const id = `${sources.join('+')}|${primary.city}|${primary.lat}|${primary.lon}`;

  return {
    city: primary.city,
    country,
    lat: primary.lat,
    lon: primary.lon,
    source: primary.source,
    weight,
    ...(anycast ? { anycast: true } : {}),
    sources,
    id,
  };
}

function dedupeKey(c: Candidate): string {
  return `${c.source}|${c.city}|${c.lat}|${c.lon}|${c.country ?? ''}`;
}

/**
 * Collapses exact same-source duplicates (same source, city and coordinates):
 * the heaviest wins, anycast is OR-ed. Removes the only input shape that could
 * otherwise produce two clusters sharing one id (VOY-P-08 hardening).
 */
function dedupeSameSource(sorted: Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  for (const c of sorted) {
    const key = dedupeKey(c);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, c);
      continue;
    }
    const winner = c.weight > prev.weight ? c : prev;
    const anycast = prev.anycast === true || c.anycast === true;
    byKey.set(key, anycast ? { ...winner, anycast: true } : { ...winner });
  }
  return [...byKey.values()].sort(compareRaw);
}

/**
 * Merges candidates from different sources closer than `settings.agreeRadiusKm`
 * using noisy-OR weights `1 - prod(1 - p_i)` and keeping the union of sources.
 * Output order is deterministic (sorted by city, then source id) — VOY-F-14, VOY-P-08.
 */
export function fuseCandidates(list: Candidate[], settings: Settings): FusedCandidate[] {
  if (list.length === 0) return [];
  const sorted = dedupeSameSource([...list].sort(compareRaw));
  const clusters = buildClusters(sorted, settings.agreeRadiusKm);
  return clusters.map(mergeCluster).sort(compareFused);
}

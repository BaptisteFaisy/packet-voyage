/**
 * The visitor's own journey, computed in the browser by the SAME pipeline the
 * CLI uses: `computeJourney` from `@packet-voyage/core`, fed with the bundled
 * datasets (name hints, landmasses, submarine cables, fixed links) and their
 * credits.
 *
 * One implementation, not two. The site used to carry a reduced copy of the
 * pipeline (`local-journey.ts`), so a pasted trace lost the light floor, the
 * inflation, the sea crossings, the compatible cables, the journey log and the
 * credits — that is, most of what the catalogue demonstrates. Measured on
 * `docs/examples/lyon-ashburn.txt`: floor null instead of 60.8 ms, inflation
 * null instead of 1.51, 0 cable instead of 6, 0 log entry instead of 11.
 *
 * Zero request (VOY-N-01): the datasets are bundled chunks loaded on demand,
 * and nothing here touches the network. When a dataset is missing the journey
 * is still computed and says so — a segment stays `undetermined` rather than
 * being called a sea crossing.
 */
import type { Journey } from '@packet-voyage/schema';
import { computeJourney } from '@packet-voyage/core';
import type { SourcePosition } from '@packet-voyage/core';
import { loadDatasets } from './datasets.ts';
import { FALLBACK_HINTS } from './hint-table.ts';
import { parseTrace } from './journey-source.ts';
import type { ParsedTrace, Settings } from './journey-source.ts';

export interface UserJourneyOptions {
  /** Injected clock: an RFC 3339 instant (determinism, §0.4). */
  tracedAt: string;
  /** Declared departure, when the visitor gives one. */
  source?: SourcePosition | null;
  settings?: Partial<Settings>;
}

export interface UserJourneyResult {
  ok: boolean;
  journey: Journey | null;
  parsed: ParsedTrace | null;
  /** First line the reader did not understand (VOY-F-02). */
  unknownLine: string | null;
  /** What the reader had to clean before understanding the paste. */
  warnings: string[];
  /** False when the bundled datasets were absent: the result is then hints-only. */
  datasetsUsed: boolean;
}

function unreadable(parsed: ParsedTrace): UserJourneyResult {
  return {
    ok: false,
    journey: null,
    parsed,
    unknownLine: parsed.unknownLines[0] ?? null,
    warnings: parsed.warnings,
    datasetsUsed: false,
  };
}

/**
 * Parse then compute a pasted trace with the full pipeline and the bundled
 * datasets. Never throws on an unreadable trace: it returns `ok: false` with
 * the first un-understood line (VOY-F-02).
 */
export async function computeUserJourney(
  text: string,
  options: UserJourneyOptions,
): Promise<UserJourneyResult> {
  const parsed = parseTrace(text);
  if (parsed.format === 'unknown' || parsed.hops.length === 0) return unreadable(parsed);
  const datasets = await loadDatasets();
  const journey = computeJourney({
    parsed,
    tracedAt: options.tracedAt,
    source: options.source ?? null,
    settings: options.settings,
    cables: datasets.cables,
    masses: datasets.masses,
    links: datasets.links,
    // Safety net only: with the vendored table absent, the compact one still
    // locates the airport codes instead of pretending nothing can be known.
    hints: datasets.hints.length > 0 ? datasets.hints : FALLBACK_HINTS,
    credits: datasets.credits,
    tool: parsed.tool === 'unknown' ? 'pasted' : parsed.tool,
  });
  return {
    ok: true,
    journey,
    parsed,
    unknownLine: null,
    warnings: parsed.warnings,
    datasetsUsed: datasets.available,
  };
}

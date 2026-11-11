/**
 * `voyage explain <journey.json>` — the analytics panel on the terminal, all of
 * it computed offline from the file: distance bounds, where the delay goes,
 * which physical media can explain it, and (with `--year`) the same journey in
 * another year of the cable dataset.
 */
import type { Journey } from '@packet-voyage/schema';
import { CliError, EXIT_BAD_ARG, EXIT_OK } from '../runtime.ts';
import type { CliContext } from '../runtime.ts';
import { loadDatasets } from '../deps.ts';
import type { DelayBreakdownLike, DistanceBoundsLike, EraComparisonLike, MediumCheckLike } from '../deps.ts';
import { readJourneyFile } from './shared.ts';

export interface ExplainCommandOptions {
  file?: string;
  year?: string;
  json: boolean;
}

function parseYear(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1950 || year > 2100) {
    throw new CliError(EXIT_BAD_ARG, `invalid --year "${raw}" (expected a year between 1950 and 2100)`);
  }
  return year;
}

function num(value: number | null, digits = 1): string {
  return value === null ? 'unknown' : value.toFixed(digits);
}

function boundsLine(bounds: DistanceBoundsLike): string {
  const upper = bounds.max_km === null ? 'no upper bound (no measured delay)' : `at most ${num(bounds.max_km, 0)} km`;
  return `Distance: at least ${num(bounds.min_km, 0)} km, ${upper}`;
}

function breakdownLine(split: DelayBreakdownLike): string {
  const share = split.residual_share === null ? 'unknown share' : `${Math.round(split.residual_share * 100)} %`;
  return `Delay: ${num(split.rtt_ms)} ms measured · light floor ${num(split.propagation_floor_ms)} ms · ` +
    `residual about ${num(split.residual_ms)} ms (${share}, ${split.reading})`;
}

function mediaLines(media: MediumCheckLike[]): string[] {
  const ok = media.filter((entry) => entry.compatible).map((entry) => entry.medium);
  const out = media.filter((entry) => !entry.compatible);
  const lines = [`Media compatible with this delay: ${ok.join(', ') || 'none'}`];
  for (const entry of out) {
    lines.push(`Media ruled out: ${entry.medium} — ${entry.note}`);
  }
  return lines;
}

function eraLines(era: EraComparisonLike): string[] {
  return [
    `Same journey in ${era.year}: ${era.available_then} dated cable(s) in service then, ` +
      `${era.compatible_then.length} compatible with the ${era.crossings} sea crossing(s), ` +
      `against ${era.compatible_now.length} at the trace date.`,
    `  ${era.verdict.en}`,
  ];
}

/** The whole panel, as one payload; `--json` prints exactly this. */
export function explainPayload(journey: Journey, ctx: CliContext, year: number | null) {
  const bounds = ctx.deps.core.distanceBounds(journey);
  const breakdown = ctx.deps.core.delayBreakdown(journey);
  const media = ctx.deps.core.mediaForJourney(journey);
  const era =
    year === null
      ? null
      : ctx.deps.core.compareWithEra({ journey, cables: loadDatasets(ctx.deps.data).cables, year });
  return { target: journey.target, traced_at: journey.traced_at, bounds, breakdown, media, era };
}

export async function runExplainCommand(opts: ExplainCommandOptions, ctx: CliContext): Promise<number> {
  const year = parseYear(opts.year);
  const journey = await readJourneyFile(opts.file, ctx);
  const payload = explainPayload(journey, ctx, year);

  if (opts.json) {
    ctx.io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
    return EXIT_OK;
  }
  const lines = [
    `Journey: ${journey.target.host} (${journey.target.ip ?? 'no address'}), traced ${journey.traced_at}`,
    boundsLine(payload.bounds),
    breakdownLine(payload.breakdown),
    ...mediaLines(payload.media),
    ...(payload.era ? eraLines(payload.era) : []),
    payload.bounds.note.en,
    payload.breakdown.note.en,
  ];
  ctx.io.stdout(`${lines.join('\n')}\n`);
  return EXIT_OK;
}

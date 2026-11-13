/**
 * `voyage read <file|->` — parse a recorded trace (file or stdin) and compute
 * a journey fully offline: name hints and embedded datasets only, no network
 * (VOY-F-43, §11.6).
 */
import { CliError, EXIT_OK, EXIT_UNREADABLE } from '../runtime.ts';
import type { CliContext } from '../runtime.ts';
import { emitJourneyJson, formatJourneyHuman } from '../output.ts';
import { loadDatasets } from '../deps.ts';
import { readInputText, resolveSourceFromFlag, writeJourneyFile } from './shared.ts';

export interface ReadCommandOptions {
  file?: string;
  from?: string;
  out?: string;
  json: boolean;
}

export async function runReadCommand(opts: ReadCommandOptions, ctx: CliContext): Promise<number> {
  const { io, deps } = ctx;
  const text = await readInputText(opts.file, io);
  const parsed = deps.core.parseTrace(text);
  if (parsed.format === 'unknown' || parsed.hops.length === 0) {
    const sample = parsed.unknownLines[0] ? ` (first line: ${parsed.unknownLines[0]})` : '';
    throw new CliError(EXIT_UNREADABLE, `unrecognized or empty trace input${sample}`);
  }

  const datasets = loadDatasets(deps.data);
  const source = resolveSourceFromFlag(opts.from, datasets.hints);
  const journey = deps.core.computeJourney({
    parsed,
    source,
    tracedAt: io.now(),
    cables: datasets.cables,
    masses: datasets.masses,
    links: datasets.links,
    hints: datasets.hints,
    credits: datasets.credits,
  });

  if (opts.out) {
    const written = await writeJourneyFile(opts.out, journey, io);
    io.stderr(`Wrote ${written}\n`);
  }
  if (opts.json) {
    emitJourneyJson(io, journey);
  } else {
    io.stdout(formatJourneyHuman(journey));
  }
  return EXIT_OK;
}

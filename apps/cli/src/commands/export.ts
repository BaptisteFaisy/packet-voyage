/**
 * `voyage export <journey.json> --format geojson|markdown` — the journey as a
 * GIS feature collection, or as a redaction-safe incident report ready to paste
 * into a hosting provider's ticket.
 *
 * Markdown export refuses an unredacted journey: a report leaves the machine,
 * so the first kilometre must already be gone (VOY-F-38).
 */
import { CliError, EXIT_BAD_ARG, EXIT_OK, EXIT_REFUSED } from '../runtime.ts';
import type { CliContext } from '../runtime.ts';
import { readJourneyFile, writeTextFile } from './shared.ts';

export type ExportFormat = 'geojson' | 'markdown';

export interface ExportCommandOptions {
  file?: string;
  format: string;
  language: string;
  out?: string;
  json: boolean;
}

function parseFormat(raw: string): ExportFormat {
  if (raw === 'geojson' || raw === 'markdown') return raw;
  throw new CliError(EXIT_BAD_ARG, `unknown --format "${raw}" (expected geojson or markdown)`);
}

function parseLanguage(raw: string): 'en' | 'fr' {
  if (raw === 'en' || raw === 'fr') return raw;
  throw new CliError(EXIT_BAD_ARG, `unknown --language "${raw}" (expected en or fr)`);
}

export async function runExportCommand(opts: ExportCommandOptions, ctx: CliContext): Promise<number> {
  const format = parseFormat(opts.format);
  const language = parseLanguage(opts.language);
  const journey = await readJourneyFile(opts.file, ctx);

  if (format === 'geojson') {
    const payload = ctx.deps.core.journeyToGeoJSON(journey);
    const text = `${JSON.stringify(payload, null, 2)}\n`;
    if (opts.out) ctx.io.stderr(`Wrote ${await writeTextFile(opts.out, text, ctx.io)}\n`);
    else ctx.io.stdout(text);
    return EXIT_OK;
  }

  if (journey.redaction?.applied !== true) {
    throw new CliError(
      EXIT_REFUSED,
      'the journey is not redacted: run `voyage share <journey.json> --out redacted.json` first, ' +
        'a report is meant to leave your machine',
    );
  }
  const report = ctx.deps.core.incidentReport(journey, language);
  if (opts.out) ctx.io.stderr(`Wrote ${await writeTextFile(opts.out, `${report}\n`, ctx.io)}\n`);
  else ctx.io.stdout(`${report}\n`);
  return EXIT_OK;
}

/**
 * `voyage share <journey.json>` — show exactly what will be shared
 * (`redactionPreview`), require an explicit confirmation unless `--yes`
 * (VOY-F-38), then redact at the chosen level and encode the fragment link;
 * when the link exceeds the fragment budget, write a redacted file instead.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JourneySchema } from '@packet-voyage/schema';
import type { Journey, RedactionLevel } from '@packet-voyage/schema';
import { CliError, EXIT_BAD_ARG, EXIT_OK, EXIT_REFUSED } from '../runtime.ts';
import type { CliContext, CliIo } from '../runtime.ts';
import { readJourneyFile } from './shared.ts';

/** Placeholder base URL; pass `--base-url` for a real deployment. */
export const DEFAULT_SHARE_BASE_URL = 'https://packet-voyage.invalid/';

export interface ShareCommandOptions {
  file?: string;
  level: string;
  baseUrl: string;
  yes: boolean;
  out?: string;
  json: boolean;
}

function parseLevel(raw: string): RedactionLevel {
  if (raw === 'country' || raw === 'city') return raw;
  throw new CliError(EXIT_BAD_ARG, `invalid --level "${raw}" (expected country or city)`);
}

async function confirmShare(io: CliIo, preview: string[], level: RedactionLevel): Promise<void> {
  io.stdout('What will be shared (redaction preview):\n');
  for (const line of preview) {
    io.stdout(`  - ${line}\n`);
  }
  const confirmed = io.isStdinTty()
    ? await io.confirm(`Share this journey at the "${level}" level?`)
    : false;
  if (!confirmed) {
    throw new CliError(
      EXIT_REFUSED,
      'share refused: not confirmed (review the preview, then re-run with --yes)',
    );
  }
}

async function saveOversizeShare(
  io: CliIo,
  redacted: Journey,
  out?: string,
): Promise<string> {
  const target = resolve(io.cwd, out ?? 'journey.shared.json');
  await writeFile(target, `${JSON.stringify(redacted, null, 2)}\n`, 'utf8');
  return target;
}

function tryEncodeLink(ctx: CliContext, redacted: Journey, baseUrl: string): { link: string | null; oversize: boolean } {
  try {
    const candidate = ctx.deps.core.encodeShareLink(redacted, baseUrl);
    if (Buffer.byteLength(candidate, 'utf8') <= ctx.deps.core.MAX_FRAGMENT_BYTES) {
      return { link: candidate, oversize: false };
    }
  } catch {
    /* oversize */
  }
  return { link: null, oversize: true };
}

function emitShareOutput(
  ctx: CliContext,
  opts: ShareCommandOptions,
  data: { level: RedactionLevel; preview: string[]; link: string | null; oversize: boolean; file: string | null; journey: Journey },
): void {
  const { io } = ctx;
  if (opts.json) {
    io.stdout(`${JSON.stringify(data, null, 2)}\n`);
  } else if (data.link) {
    io.stdout(`${data.link}\n`);
  } else {
    io.stdout(
      `Link would exceed the ${ctx.deps.core.MAX_FRAGMENT_BYTES}-byte fragment budget; wrote the redacted journey to ${data.file}\n`,
    );
  }
}

export async function runShareCommand(opts: ShareCommandOptions, ctx: CliContext): Promise<number> {
  const level = parseLevel(opts.level);
  const journey = await readJourneyFile(opts.file, ctx);
  const preview = ctx.deps.core.redactionPreview(journey, level);
  if (!opts.yes) await confirmShare(ctx.io, preview, level);

  const redacted = JourneySchema.parse(ctx.deps.core.redactJourney(journey, level));
  const { link, oversize } = tryEncodeLink(ctx, redacted, opts.baseUrl);
  const file = oversize || opts.out ? await saveOversizeShare(ctx.io, redacted, opts.out) : null;

  emitShareOutput(ctx, opts, { level, preview, link, oversize, file, journey: redacted });
  return EXIT_OK;
}

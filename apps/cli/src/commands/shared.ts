/**
 * Shared command helpers: `--from` resolution, input reading (file/stdin,
 * exit 5 when unreadable), journey writing, the consent gate (VOY-F-13),
 * and the default fetcher built on the global `fetch`.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseJourney } from '@packet-voyage/schema';
import type { HintCity, Journey } from '@packet-voyage/schema';
import type { ConsentStateLike, FetcherLike } from '../deps.ts';
import { CliError, EXIT_BAD_ARG, EXIT_REFUSED, EXIT_UNREADABLE } from '../runtime.ts';
import type { CliContext, CliIo } from '../runtime.ts';

export interface DeclaredSource {
  lat: number;
  lon: number;
  label?: string;
  country?: string;
}

/**
 * Resolve `--from <city>` against the embedded hints table (city name or
 * router code) or an explicit `"lat,lon"`. Never invents a position: an
 * unknown city is a bad argument (exit 2).
 */
export function resolveSourceFromFlag(
  raw: string | undefined,
  hints: HintCity[],
): DeclaredSource | null {
  if (!raw || raw.trim() === '') return null;
  const trimmed = raw.trim();
  const coords = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (coords) {
    const lat = Number(coords[1]);
    const lon = Number(coords[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new CliError(EXIT_BAD_ARG, `invalid --from coordinates "${trimmed}"`);
    }
    return { lat, lon, label: trimmed };
  }
  const needle = trimmed.toLowerCase();
  const found =
    hints.find((hint) => hint.city.toLowerCase() === needle) ??
    hints.find((hint) => hint.code.toLowerCase() === needle);
  if (!found) {
    throw new CliError(
      EXIT_BAD_ARG,
      `unknown --from city "${trimmed}": not found in the embedded hints table (try "lat,lon")`,
    );
  }
  return {
    lat: found.lat,
    lon: found.lon,
    label: `${found.city}, ${found.country}`,
    country: found.country,
  };
}

/** Read a trace/journey file, or stdin for `-` (or a missing argument). */
export async function readInputText(fileArg: string | undefined, io: CliIo): Promise<string> {
  if (fileArg !== undefined && fileArg !== '-' && fileArg.startsWith('-')) {
    // §18: an operand starting with a dash is a bad argument, never a file.
    throw new CliError(EXIT_BAD_ARG, `refusing argument starting with a dash: "${fileArg}"`);
  }
  if (!fileArg || fileArg === '-') {
    if (!fileArg && io.isStdinTty()) {
      throw new CliError(EXIT_BAD_ARG, 'missing input file (pass a path, or "-" to read stdin)');
    }
    try {
      const text = await io.readStdin();
      if (text.trim() === '') {
        throw new CliError(EXIT_UNREADABLE, 'stdin was empty');
      }
      return text;
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new CliError(EXIT_UNREADABLE, `cannot read stdin: ${(error as Error).message}`);
    }
  }
  const abs = resolve(io.cwd, fileArg);
  if (!existsSync(abs)) {
    throw new CliError(EXIT_UNREADABLE, `file not found: ${fileArg}`);
  }
  try {
    return await readFile(abs, 'utf8');
  } catch (error) {
    throw new CliError(EXIT_UNREADABLE, `cannot read "${fileArg}": ${(error as Error).message}`);
  }
}

/** Read and validate a stored journey (exit 5 when unreadable or invalid). */
export async function readJourneyFile(
  fileArg: string | undefined,
  ctx: CliContext,
): Promise<Journey> {
  if (!fileArg) {
    throw new CliError(EXIT_BAD_ARG, 'missing <journey.json> argument');
  }
  const text = await readInputText(fileArg, ctx.io);
  try {
    return parseJourney(text);
  } catch (error) {
    throw new CliError(
      EXIT_UNREADABLE,
      `invalid journey JSON in "${fileArg}": ${(error as Error).message}`,
    );
  }
}

export async function writeJourneyFile(
  outPath: string,
  journey: Journey,
  io: CliIo,
): Promise<string> {
  const abs = resolve(io.cwd, outPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(journey, null, 2)}\n`, 'utf8');
  return abs;
}

const CONSENT_SERVICES = ['dns', 'ripestat', 'ipmap', 'peeringdb'];

/**
 * Consent gate: returns the stored state; when interactive, shows the
 * documented prompt once and remembers the answer (VOY-F-13). With
 * `refuseOnMissing`, a refusal becomes exit 4 (`enrich`, `data update`).
 */
export async function ensureConsent(
  ctx: CliContext,
  opts: { allowPrompt: boolean; refuseOnMissing: boolean },
): Promise<ConsentStateLike> {
  const { enrich } = ctx.deps;
  const current = enrich.readConsent(ctx.home);
  if (current.granted) return current;
  if (opts.allowPrompt && ctx.io.isStdinTty()) {
    ctx.io.stderr(`${enrich.consentPromptText()}\n`);
    const accepted = await ctx.io.confirm('Send public hop addresses to these services?');
    if (accepted) {
      const granted: ConsentStateLike = {
        granted: true,
        services: CONSENT_SERVICES,
        grantedAt: ctx.io.now(),
      };
      enrich.writeConsent(ctx.home, granted);
      return granted;
    }
  }
  if (opts.refuseOnMissing) {
    throw new CliError(
      EXIT_REFUSED,
      'refused: consent for third-party lookups is not granted (see `voyage consent grant`)',
    );
  }
  return current;
}

/** Fetcher built on the global `fetch`; the enrich layer logs every URL. */
export function defaultFetcher(): FetcherLike {
  return async (url, init) => {
    const response = await fetch(url, init);
    return {
      status: response.status,
      json: () => response.json() as Promise<unknown>,
      text: () => response.text(),
    };
  };
}

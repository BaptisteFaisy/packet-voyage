/**
 * `voyage compare <a.json> <b.json>` — two journeys side by side: the same
 * target over IPv4 and IPv6, or the same route at two moments (§8 P6).
 *
 * Facts only. The output never explains a difference, because a traceroute
 * cannot: it states what changed, with the numbers.
 */
import { CliError, EXIT_BAD_ARG, EXIT_OK } from '../runtime.ts';
import type { CliContext } from '../runtime.ts';
import type { JourneyDiffLike } from '../deps.ts';
import { readJourneyFile } from './shared.ts';

export interface CompareCommandOptions {
  files: string[];
  language: string;
  json: boolean;
}

function pair(value: { a: number | null; b: number | null }): string {
  return `${value.a ?? '—'} → ${value.b ?? '—'}`;
}

function formatDiff(diff: JourneyDiffLike, language: 'en' | 'fr'): string {
  const lines = [
    language === 'fr' ? 'Comparaison de deux trajets' : 'Two journeys compared',
    `- ${language === 'fr' ? 'cible identique' : 'same target'} : ${diff.same_target}`,
    `- distance (km, ${language === 'fr' ? 'au moins' : 'at least'}) : ${diff.distance_km.a.toFixed(0)} → ${diff.distance_km.b.toFixed(0)} (${diff.distance_km.delta >= 0 ? '+' : ''}${diff.distance_km.delta.toFixed(0)})`,
    `- rtt (ms) : ${pair(diff.rtt_ms)}`,
    `- inflation : ${pair(diff.inflation)}`,
    `- ${language === 'fr' ? 'étapes' : 'hops'} : ${diff.hops.a} → ${diff.hops.b} · ${language === 'fr' ? 'localisées' : 'located'} : ${diff.located_hops.a} → ${diff.located_hops.b}`,
    `- ${language === 'fr' ? 'pays ajoutés' : 'countries added'} : ${diff.countries_added.join(', ') || '—'}`,
    `- ${language === 'fr' ? 'pays disparus' : 'countries removed'} : ${diff.countries_removed.join(', ') || '—'}`,
    `- ${language === 'fr' ? 'rejets par la lumière' : 'rejected by light'} : ${diff.rejected_by_light.a} → ${diff.rejected_by_light.b}`,
    `- ${language === 'fr' ? 'détours' : 'detours'} : ${diff.detours.a} → ${diff.detours.b}`,
    `- ${language === 'fr' ? 'chemin changé' : 'path changed'} : ${diff.path_changed}`,
    diff.sentence[language],
  ];
  return `${lines.join('\n')}\n`;
}

export async function runCompareCommand(opts: CompareCommandOptions, ctx: CliContext): Promise<number> {
  if (opts.files.length !== 2) {
    throw new CliError(EXIT_BAD_ARG, 'compare needs exactly two journey files: voyage compare a.json b.json');
  }
  const language = opts.language === 'fr' ? 'fr' : 'en';
  const [fileA, fileB] = opts.files as [string, string];
  const a = await readJourneyFile(fileA, ctx);
  const b = await readJourneyFile(fileB, ctx);
  const diff = ctx.deps.core.diffJourneys(a, b);
  if (opts.json) ctx.io.stdout(`${JSON.stringify(diff, null, 2)}\n`);
  else ctx.io.stdout(formatDiff(diff, language));
  return EXIT_OK;
}

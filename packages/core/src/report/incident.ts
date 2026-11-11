/**
 * An incident report a developer can paste into a hosting provider's ticket
 * (the Karim persona of §3): the facts, their certainty level, and an explicit
 * statement of what the report does NOT establish.
 *
 * It refuses to run on a journey that has not been redacted: the first kilometre
 * belongs to the user, and a ticket is a publication (VOY-F-38, VOY-N-13).
 */
import type { Journey } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { delay, distance, levelLabel, num } from '../story/index.ts';
import type { Lang } from '../story/index.ts';

export class UnredactedJourneyError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`refusing to write a report from an unredacted journey: ${reason}`);
    this.name = 'UnredactedJourneyError';
    this.reason = reason;
  }
}

function assertRedacted(journey: Journey): void {
  if (journey.redaction?.applied === true) return;
  throw new UnredactedJourneyError(
    'run redactJourney(journey, "country") first — a report leaves the machine',
  );
}

function head(journey: Journey, lang: Lang): string[] {
  const title = lang === 'fr' ? 'Rapport de trajet' : 'Journey report';
  return [
    `# ${title} — ${journey.target.host}`,
    '',
    lang === 'fr'
      ? `Trace enregistrée le ${journey.traced_at} (UTC) avec ${journey.tool}, protocole ${journey.protocol}, IPv${journey.family}.`
      : `Trace recorded on ${journey.traced_at} (UTC) with ${journey.tool}, protocol ${journey.protocol}, IPv${journey.family}.`,
    '',
  ];
}

/** A travelled distance is a lower bound, and the report says so (§5.4). */
function bounded(km: number, lang: Lang, settings: Settings): string {
  return `${lang === 'fr' ? 'au moins' : 'at least'} ${distance(km, lang, settings)}`;
}

/** French puts a narrow space before the colon; English does not. */
function colon(lang: Lang): string {
  return lang === 'fr' ? ' : ' : ': ';
}

function summaryBlock(journey: Journey, lang: Lang, settings: Settings): string[] {
  const s = journey.summary;
  const rtt = s.rtt_ms ?? null;
  const floor = s.light_floor_ms ?? null;
  const inflation = s.inflation ?? null;
  const label = lang === 'fr' ? '## Bilan' : '## Summary';
  const lines = [
    label,
    '',
    `- ${lang === 'fr' ? 'Distance' : 'Distance'}${colon(lang)}${bounded(s.distance_km_min, lang, settings)}`,
    `- ${lang === 'fr' ? 'Délai aller-retour' : 'Round-trip delay'}${colon(lang)}${rtt === null ? '—' : delay(rtt, lang)} (${lang === 'fr' ? 'mesuré' : 'measured'})`,
    `- ${lang === 'fr' ? 'Plancher de la lumière' : 'Light floor'}${colon(lang)}${floor === null ? '—' : delay(floor, lang)}`,
    `- ${lang === 'fr' ? 'Inflation' : 'Inflation'}${colon(lang)}${inflation === null ? '—' : num(inflation, lang, 2)}`,
    `- ${lang === 'fr' ? 'Pays où une étape a été localisée' : 'Countries where a hop was located'}${colon(lang)}${s.countries.join(', ') || '—'}`,
    `- ${lang === 'fr' ? 'Rejets par la lumière' : 'Rejected by light'}${colon(lang)}${s.rejected_by_light} · ${lang === 'fr' ? 'trous' : 'gaps'}${colon(lang)}${s.gaps}`,
    '',
  ];
  return lines;
}

function pathBlock(journey: Journey, lang: Lang): string[] {
  const title = lang === 'fr' ? '## Chemin localisé' : '## Located path';
  const lines = [title, ''];
  for (const hop of journey.hops) {
    const loc = hop.location;
    if (!loc) {
      lines.push(`- ttl ${hop.ttl} — ${lang === 'fr' ? 'non localisé' : 'not located'} (${hop.class})`);
      continue;
    }
    const sources = loc.sources.join(', ');
    lines.push(
      `- ttl ${hop.ttl} — ${loc.city}${loc.country ? `, ${loc.country}` : ''} ` +
        `(${levelLabel(loc.level, lang)}, ${lang === 'fr' ? 'sources' : 'sources'}: ${sources})`,
    );
  }
  return [...lines, ''];
}

function rejectionBlock(journey: Journey, lang: Lang, settings: Settings): string[] {
  const title = lang === 'fr' ? '## Localisations rejetées' : '## Rejected locations';
  const lines = [title, ''];
  for (const hop of journey.hops) {
    for (const rejected of hop.location?.rejected ?? []) {
      lines.push(
        `- ttl ${hop.ttl}: ${rejected.city}${rejected.country ? `, ${rejected.country}` : ''} ` +
          `(${rejected.source}, ${rejected.reason}) — ${lang === 'fr' ? 'permis au plus' : 'allowed at most'} ` +
          `${distance(rejected.allowed_km, lang, settings)}, ${lang === 'fr' ? 'nécessiterait au moins' : 'would need at least'} ` +
          `${distance(rejected.needed_km, lang, settings)}`,
      );
    }
  }
  if (lines.length === 2) lines.push(lang === 'fr' ? '- aucun rejet' : '- none');
  return [...lines, ''];
}

function deltaText(value: number | null, lang: Lang): string {
  return value === null ? '' : `, ${delay(value, lang)}`;
}

function crossingBlock(journey: Journey, lang: Lang, settings: Settings): string[] {
  const title = lang === 'fr' ? '## Traversées et câbles compatibles' : '## Crossings and compatible cables';
  const lines = [title, ''];
  for (const segment of journey.segments) {
    if (segment.kind === 'local') continue;
    const names = segment.cables.map((cable) => cable.name).join(', ') || (lang === 'fr' ? 'aucun' : 'none');
    lines.push(
      `- ttl ${segment.from_ttl} → ${segment.to_ttl} (${segment.kind}) : ` +
        `${distance(segment.geodesic_km, lang, settings)} ${lang === 'fr' ? 'à vol d\u2019oiseau' : 'as the crow flies'}` +
        `${deltaText(segment.delta_ms ?? null, lang)}. ` +
        `${lang === 'fr' ? 'Câbles compatibles' : 'Compatible cables'}${colon(lang)}${names}` +
        `${segment.other_cables > 0 ? ` (+${segment.other_cables})` : ''}.`,
    );
  }
  if (lines.length === 2) lines.push(lang === 'fr' ? '- aucune traversée' : '- no crossing');
  lines.push('');
  lines.push(
    lang === 'fr'
      ? 'Rien dans la mesure ne dit lequel de ces câbles a porté le paquet.'
      : 'Nothing in the measurement says which one of these cables carried the packet.',
  );
  return [...lines, ''];
}

function limitsBlock(journey: Journey, lang: Lang): string[] {
  const title = lang === 'fr' ? "## Ce que ce rapport n'établit pas" : '## What this report does not establish';
  const en = [
    '- No return path: a traceroute only sees the way there, so delays mix two routes.',
    '- No cable identified: the cables above are compatible with the crossing, not observed.',
    '- Positions are inferred from databases, exchange prefixes and router names, then filtered by the speed of light.',
    '- Distances are lower bounds (great-circle sums), not cable lengths.',
    `- Silent hops are holes, not zeros: ${journey.summary.gaps} of them here.`,
  ];
  const fr = [
    "- Pas de chemin de retour : un traceroute ne voit que l'aller, les délais mélangent deux routes.",
    "- Aucun câble identifié : ceux listés sont compatibles avec la traversée, pas observés.",
    '- Les positions sont déduites de bases, de préfixes de points d\u2019échange et de noms de routeurs, puis filtrées par la vitesse de la lumière.',
    "- Les distances sont des bornes basses (sommes à vol d'oiseau), pas des longueurs de câble.",
    `Les étapes muettes sont des trous, pas des zéros : ${journey.summary.gaps} ici.`,
  ];
  return [title, '', ...(lang === 'fr' ? fr : en), ''];
}

/** The Markdown report. Throws `UnredactedJourneyError` on a raw journey. */
export function incidentReport(journey: Journey, language: Lang = 'en', settings: Settings = DEFAULT_SETTINGS): string {
  assertRedacted(journey);
  const credits = journey.credits.length > 0
    ? [language === 'fr' ? '## Crédits des données' : '## Data credits', '', ...journey.credits.map((c) => `- ${c}`), '']
    : [];
  return [
    ...head(journey, language),
    ...summaryBlock(journey, language, settings),
    ...pathBlock(journey, language),
    ...rejectionBlock(journey, language, settings),
    ...crossingBlock(journey, language, settings),
    ...limitsBlock(journey, language),
    ...credits,
  ].join('\n');
}

/**
 * Journey-log templates (§7.12). Sentences are produced from the structured
 * journey only: no language model, no invented fact, and every value carries
 * its certainty level in the wording itself (§5.3, §5.4).
 */
import type { Hop, Journey, Location, Rejection, Segment } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';
import { toMiles } from '../geo/index.ts';

export type Lang = 'en' | 'fr';

const EN = new Intl.NumberFormat('en-US');
const FR = new Intl.NumberFormat('fr-FR');

export function num(value: number, lang: Lang, digits = 0): string {
  const fmt = lang === 'fr' ? FR : EN;
  return fmt.format(Number(value.toFixed(digits)));
}

/** A distance in the user's unit, always a lower bound in the journey log. */
export function distance(kmValue: number, lang: Lang, settings: Settings): string {
  const value = settings.unit === 'mi' ? toMiles(kmValue) : kmValue;
  return `${num(value, lang)} ${settings.unit === 'mi' ? 'mi' : 'km'}`;
}

export function delay(msValue: number, lang: Lang): string {
  return `${num(msValue, lang, 1)} ms`;
}

const LEVEL_LABEL: Record<Location['level'], Record<Lang, string>> = {
  solid: { en: 'solid', fr: 'solide' },
  probable: { en: 'likely', fr: 'probable' },
  uncertain: { en: 'uncertain', fr: 'incertain' },
  unlocated: { en: 'not located', fr: 'non localisée' },
};

export function levelLabel(level: Location['level'], lang: Lang): string {
  return LEVEL_LABEL[level][lang];
}

function place(location: Location, lang: Lang): string {
  const country = location.country ? `, ${location.country}` : '';
  return `${location.city}${country} (${levelLabel(location.level, lang)})`;
}

function networkOf(hop: Hop, lang: Lang): string {
  if (hop.asn == null) return lang === 'fr' ? 'Réseau : inconnu.' : 'Network: unknown.';
  const name = hop.as_name ? ` (${hop.as_name})` : '';
  return lang === 'fr' ? `Réseau : AS${hop.asn}${name}.` : `Network: AS${hop.asn}${name}.`;
}

/** A located hop: what is measured (the delay) and what is inferred (the city). */
export function stopTexts(hop: Hop, location: Location) {
  const when = hop.envelope_ms == null ? null : delay(hop.envelope_ms, 'en');
  const quand = hop.envelope_ms == null ? null : delay(hop.envelope_ms, 'fr');
  return {
    en: `Stop ${hop.ttl} — ${place(location, 'en')}. ${networkOf(hop, 'en')}` +
      (when ? ` ${when} after departure.` : ''),
    fr: `Étape ${hop.ttl} — ${place(location, 'fr')}. ${networkOf(hop, 'fr')}` +
      (quand ? ` ${quand} après le départ.` : ''),
  };
}

/** A rejection is the demonstration: it quotes both distances (§7.6). */
export function rejectedTexts(hop: Hop, rejection: Rejection, settings: Settings) {
  const env = hop.envelope_ms == null ? null : delay(hop.envelope_ms, 'en');
  const allowed = distance(rejection.allowed_km, 'en', settings);
  const needed = distance(rejection.needed_km, 'en', settings);
  const allowedFr = distance(rejection.allowed_km, 'fr', settings);
  const neededFr = distance(rejection.needed_km, 'fr', settings);
  const place_ = `${rejection.city}${rejection.country ? `, ${rejection.country}` : ''}`;
  return {
    en: `${place_} — rejected by light: ${env ?? 'the measured delay'} allows at most ` +
      `${allowed}; at least ${needed} would be needed.`,
    fr: `${place_} — rejetée par la lumière : ${env ?? 'le délai mesuré'} permet au plus ` +
      `${allowedFr} ; il en faudrait au moins ${neededFr}.`,
  };
}

/** A silent or unlocated hop stays a counted hole: nothing is placed. */
export function gapTexts(hop: Hop) {
  const probes = hop.replies.length;
  return {
    en: `Hop ${hop.ttl} — not located. ${probes} answer(s) recorded, none usable; ` +
      `no position is invented.`,
    fr: `Étape ${hop.ttl} — non localisée. ${probes} réponse(s) enregistrée(s), aucune exploitable ; ` +
      `aucune position n'est inventée.`,
  };
}

const KIND_LABEL: Record<Segment['kind'], Record<Lang, string>> = {
  local: { en: 'Same city', fr: 'Même ville' },
  undetermined: { en: 'Overland or undersea: cannot tell', fr: 'terrestre ou maritime, impossible de trancher' },
  sea: { en: 'Sea crossing', fr: 'maritime' },
  'sea-or-fixed': { en: 'Sea crossing or fixed link', fr: 'maritime ou ouvrage fixe' },
};

/** A crossing: the straight-line distance, the delay, the compatible cables. */
export function crossingTexts(segment: Segment, settings: Settings) {
  const label = KIND_LABEL[segment.kind];
  const kmEn = distance(segment.geodesic_km, 'en', settings);
  const kmFr = distance(segment.geodesic_km, 'fr', settings);
  const link = segment.fixed_link ? ` (${segment.fixed_link})` : '';
  const msEn = segment.delta_ms == null ? '' : `, ${delay(segment.delta_ms, 'en')} later`;
  const msFr = segment.delta_ms == null ? '' : `, ${delay(segment.delta_ms, 'fr')} plus tard`;
  const cables = cablesSentence(segment, 'en');
  const cablesFr = cablesSentence(segment, 'fr');
  return {
    en: `Crossing — ${label.en}${link}. At least ${kmEn} as the crow flies${msEn}. ${cables}`,
    fr: `Traversée — ${label.fr}${link}. Au moins ${kmFr} à vol d'oiseau${msFr}. ${cablesFr}`,
  };
}

function cablesSentence(segment: Segment, lang: Lang): string {
  const shown = segment.cables.length;
  if (shown === 0) {
    return lang === 'fr'
      ? 'Aucun câble du jeu de données n’est compatible avec cette traversée ; la traversée est certaine, le support ne l’est pas.'
      : 'No cable in the dataset is compatible with this crossing; the crossing itself is certain, the medium is not.';
  }
  const names = segment.cables.map((cable) => cable.name).join(', ');
  const more = segment.other_cables > 0
    ? lang === 'fr'
      ? ` (${segment.other_cables} autres compatibles)`
      : ` (${segment.other_cables} other compatible cables)`
    : '';
  return lang === 'fr'
    ? `${shown} câble(s) compatible(s) avec cette traversée : ${names}${more}. Rien dans la mesure ne dit lequel a porté votre paquet.`
    : `${shown} compatible cable(s) for this crossing: ${names}${more}. Nothing in the measurement says which one carried your packet.`;
}

/** The final banner sentence: at least this far, this long, against light. */
export function arrivalTexts(journey: Journey, settings: Settings) {
  const s = journey.summary;
  const distEn = distance(s.distance_km_min, 'en', settings);
  const distFr = distance(s.distance_km_min, 'fr', settings);
  const rtt = s.rtt_ms == null ? null : delay(s.rtt_ms, 'en');
  const floor = s.light_floor_ms == null ? null : delay(s.light_floor_ms, 'en');
  const inflation = s.inflation == null ? null : num(s.inflation, 'en', 2);
  const parts = (lang: Lang): string => {
    const bits = [lang === 'fr' ? `Au moins ${distFr}` : `At least ${distEn}`];
    if (rtt) bits.push(lang === 'fr' ? `${rtt} mesurées` : `${rtt} measured`);
    if (floor) bits.push(lang === 'fr' ? `la lumière seule : ${floor}` : `light alone: ${floor}`);
    if (inflation) bits.push(lang === 'fr' ? `inflation ${inflation}` : `inflation ${inflation}`);
    return bits.join(lang === 'fr' ? ' · ' : ' · ');
  };
  return {
    en: `Arrival — ${journey.target.host}. ${parts('en')}.`,
    fr: `Arrivée — ${journey.target.host}. ${parts('fr')}.`,
  };
}

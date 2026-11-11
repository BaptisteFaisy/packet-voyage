import type { Language } from '../i18n/context.tsx';

export type DistanceUnit = 'km' | 'mi';

const KM_PER_MILE = 0.621371;

export function toDisplayDistance(km: number, unit: DistanceUnit): number {
  return unit === 'mi' ? km * KM_PER_MILE : km;
}

export function formatNumber(value: number, language: Language): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString(locale, { maximumFractionDigits: 1 });
}

export function formatInteger(value: number, language: Language): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return Math.round(value).toLocaleString(locale);
}

export function formatDistance(km: number, unit: DistanceUnit, language: Language): string {
  const value = toDisplayDistance(km, unit);
  return `${formatInteger(value, language)} ${unit}`;
}

export function formatQualifiedDistance(
  km: number,
  unit: DistanceUnit,
  language: Language,
): string {
  const value = toDisplayDistance(km, unit);
  const qualifier = language === 'fr' ? 'au moins' : 'at least';
  return `${qualifier} ${formatInteger(value, language)} ${unit}`;
}

export function formatMs(value: number | null | undefined, language: Language): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${formatNumber(value, language)} ms`;
}

export function formatInflation(value: number | null | undefined, language: Language): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return `×${value.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string, language: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function daysSince(iso: string, now: number): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((now - then) / 86_400_000);
}

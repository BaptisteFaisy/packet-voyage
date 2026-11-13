/**
 * Taking a journey out of the browser (VOY-F-40 family): as GeoJSON for anything
 * that reads geography, and as a Markdown incident report for a ticket.
 *
 * No network, no service: the files are built here and handed to the browser as
 * `blob:` URLs, which the CSP already allows. The report is gated on redaction —
 * a report is meant to leave the machine, so the first kilometre must be gone.
 */
import type { Journey } from '@packet-voyage/schema';
import { incidentReport, journeyToGeoJSON, redactJourney, redactionPreview } from '@packet-voyage/core';
import type { Language } from '../i18n/context.ts';
import { exportFileName } from './export-image.ts';

export interface TextDownload {
  text: string;
  fileName: string;
}

export interface GeoJsonDownload extends TextDownload {
  counts: { hops: number; segments: number; undrawn: number };
}

function withExtension(journey: Journey, extension: 'geojson' | 'md'): string {
  return exportFileName(journey).replace(/\.png$/, `.${extension}`);
}

/** True while the journey still carries what the redaction would remove. */
export function needsRedaction(journey: Journey): boolean {
  return journey.redaction?.applied !== true;
}

/** The journey as a FeatureCollection, with the counts the UI must state. */
export function geoJsonDownload(journey: Journey): GeoJsonDownload {
  const collection = journeyToGeoJSON(journey);
  const hops = collection.features.filter((f) => f.properties.kind === 'hop').length;
  const segments = collection.features.filter((f) => f.properties.kind === 'segment').length;
  const undrawn = collection.properties.undrawn_segments as unknown[] | undefined;
  return {
    text: `${JSON.stringify(collection, null, 2)}\n`,
    fileName: withExtension(journey, 'geojson'),
    counts: { hops, segments, undrawn: undrawn?.length ?? 0 },
  };
}

/** The ticket report. Throws `UnredactedJourneyError` on a raw journey. */
export function reportDownload(journey: Journey, language: Language): TextDownload {
  return { text: `${incidentReport(journey, language)}\n`, fileName: withExtension(journey, 'md') };
}

/** What the report would contain once redacted, shown before confirmation. */
export function redactionPlan(journey: Journey): { journey: Journey; preview: string[] } {
  return { journey: redactJourney(journey, 'country'), preview: redactionPreview(journey, 'country') };
}

/** Hand a text file to the browser. Isolated so tests can stub it. */
export function downloadTextFile(text: string, fileName: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

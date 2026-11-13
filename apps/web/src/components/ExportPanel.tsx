/**
 * Take the journey with you (VOY-F-40 family): GeoJSON for anything that reads
 * geography, and a Markdown incident report for a hosting provider's ticket.
 *
 * The report is gated: it is the one artefact here that is meant to leave the
 * machine, so an unredacted journey gets a preview of what would be shared and a
 * button that redacts first (§5.2, VOY-F-38).
 */
import { useState } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { QrShare } from './QrShare.tsx';
import {
  downloadTextFile,
  geoJsonDownload,
  needsRedaction,
  redactionPlan,
  reportDownload,
} from '../lib/exporters.ts';

export interface ExportPanelProps {
  journey: Journey;
  /** Set when the journey is one of the gallery's: its link is short enough to scan. */
  slug?: string;
}

type PanelState = 'idle' | 'busy' | 'error';

function run(setState: (s: PanelState) => void, setError: (m: string) => void, action: () => void): void {
  setState('busy');
  try {
    action();
    setState('idle');
  } catch (error) {
    setError((error as Error).message);
    setState('error');
  }
}

/** The GeoJSON download, with the counts the honesty contract asks for. */
function GeoJsonBlock({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const [state, setState] = useState<PanelState>('idle');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState('');
  const onDownload = () =>
    run(setState, setError, () => {
      const file = geoJsonDownload(journey);
      downloadTextFile(file.text, file.fileName, 'application/geo+json');
      setCounts(
        t('exportPanel.features', {
          hops: file.counts.hops,
          segments: file.counts.segments,
          undrawn: file.counts.undrawn,
        }),
      );
    });
  return (
    <div className="export-block">
      <button type="button" data-testid="export-geojson" aria-busy={state === 'busy'} onClick={onDownload}>
        {t('exportPanel.geojson')}
      </button>
      <p className="hint">{t('exportPanel.geojsonHint')}</p>
      {counts ? <p className="export-counts" data-testid="export-geojson-counts">{counts}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

/** The ticket report: redacted first, with the preview shown before confirming. */
function ReportBlock({ journey }: { journey: Journey }) {
  const { t, language } = useI18n();
  const [state, setState] = useState<PanelState>('idle');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string[] | null>(null);

  const download = (target: Journey) =>
    run(setState, setError, () => {
      const file = reportDownload(target, language);
      downloadTextFile(file.text, file.fileName, 'text/markdown');
      setPreview(null);
    });

  const onReport = () => {
    if (needsRedaction(journey)) {
      setPreview(redactionPlan(journey).preview);
      return;
    }
    download(journey);
  };

  return (
    <div className="export-block">
      <button type="button" data-testid="export-report" aria-busy={state === 'busy'} onClick={onReport}>
        {t('exportPanel.report')}
      </button>
      <p className="hint">{t('exportPanel.reportHint')}</p>
      {preview ? (
        <div className="export-redaction" data-testid="export-redaction">
          <p>{t('exportPanel.needsRedaction')}</p>
          <ul>
            {preview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="export-report-redacted"
            onClick={() => download(redactionPlan(journey).journey)}
          >
            {t('exportPanel.redactThenDownload')}
          </button>
        </div>
      ) : null}
      {state === 'error' ? (
        <p role="alert" data-testid="export-report-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ExportPanel({ journey, slug }: ExportPanelProps) {
  const { t } = useI18n();
  return (
    <section className="export-panel" data-testid="export-panel">
      <h3>{t('exportPanel.title')}</h3>
      <GeoJsonBlock journey={journey} />
      <ReportBlock journey={journey} />
      <QrShare journey={journey} slug={slug} />
    </section>
  );
}

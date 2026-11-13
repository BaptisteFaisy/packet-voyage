/**
 * VOY-F-40 — export the map as a PNG, credits included, with the replacement
 * text generated from the summary (§12.4) shown next to the button so it can be
 * pasted wherever the image is shared.
 *
 * No network, no service: the encoding happens in the browser and the file is
 * handed over through a `blob:` URL, which the CSP already allows.
 */
import { useState } from 'react';
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { exportJourneyImage } from '../lib/export-image.ts';
import type { ExportedImage } from '../lib/export-image.ts';

type ExportState = 'idle' | 'busy' | 'done' | 'failed';

export interface ExportImageButtonProps {
  journey: Journey;
  masses: Landmass[];
  cables: Cable[];
  /** Injected in tests; defaults to the real encoder. */
  encoder?: typeof exportJourneyImage;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Hand the blob to the browser as a download, then forget the object URL. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportImageButton(props: ExportImageButtonProps) {
  const { journey, masses, cables } = props;
  const encoder = props.encoder ?? exportJourneyImage;
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  const [state, setState] = useState<ExportState>('idle');
  const [image, setImage] = useState<ExportedImage | null>(null);

  async function onExport(): Promise<void> {
    setState('busy');
    try {
      const produced = await encoder({
        journey,
        masses,
        cables,
        language,
        unit: prefs.unit,
        projection: prefs.projection,
        generatedOn: today(),
      });
      downloadBlob(produced.blob, produced.fileName);
      setImage(produced);
      setState('done');
    } catch {
      setImage(null);
      setState('failed');
    }
  }

  return (
    <div className="export-image" data-testid="export-image">
      <button
        type="button"
        onClick={() => void onExport()}
        disabled={state === 'busy'}
        aria-busy={state === 'busy'}
        aria-describedby="export-image-alt"
        data-testid="export-image-button"
      >
        {state === 'busy' ? t('export.busy') : t('export.button')}
      </button>
      <ExportStatus state={state} image={image} />
    </div>
  );
}

/** What the export reports: a failure, or the replacement text of the image. */
function ExportStatus({ state, image }: { state: ExportState; image: ExportedImage | null }) {
  const { t } = useI18n();
  if (state === 'failed') {
    return (
      <p role="alert" className="export-error" data-testid="export-image-error">
        {t('export.failed')}
      </p>
    );
  }
  if (state === 'done' && image) {
    return (
      <p className="export-alt" id="export-image-alt" data-testid="export-image-alt">
        {t('export.done')} {image.alt}
      </p>
    );
  }
  return (
    <p className="sr-only" id="export-image-alt">
      {t('export.button')}
    </p>
  );
}

/**
 * The share link as a QR code, generated in the browser.
 *
 * The journey is redacted first (country level), like every other share: a QR
 * code on a screen is a screenshot waiting to happen.
 */
import { useMemo } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { encodeShareLink, redactJourney } from '@packet-voyage/core';
import { useI18n } from '../i18n/context.tsx';
import { MAX_QR_TEXT, qrGeometry, qrMatrix, qrSvg, QrTooLongError } from '../lib/qr.ts';
import type { QrGeometry } from '../lib/qr.ts';
import { downloadTextFile } from '../lib/exporters.ts';

const QR_SIZE = 220;

export interface QrShareProps {
  journey: Journey;
  /** Where the link points; defaults to the current page. */
  baseUrl?: string;
  /** When the journey is one of the gallery's, its link is short enough to scan. */
  slug?: string;
  encoder?: (journey: Journey, baseUrl: string) => string;
}

function currentBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://packet-voyage.invalid/';
  return `${window.location.origin}${window.location.pathname}`;
}

/** The code as real SVG elements: never an injected HTML string. */
function QrSvg({ geometry, label }: { geometry: QrGeometry | null; label: string }) {
  const total = geometry?.total ?? 0;
  return (
    <svg
      className="qr-image"
      data-testid="qr-image"
      role="img"
      aria-label={label}
      width={QR_SIZE}
      height={QR_SIZE}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={geometry?.d ?? ''} fill="#0b1220" />
    </svg>
  );
}

export function QrShare(props: QrShareProps) {
  const { t } = useI18n();
  const baseUrl = props.baseUrl ?? currentBaseUrl();

  const result = useMemo(() => {
    const encode = props.encoder ?? ((journey: Journey, url: string) => encodeShareLink(journey, url));
    try {
      const redacted = redactJourney(props.journey, 'country');
      // A gallery journey has a short address; a private one carries the whole
      // journey in the fragment, which no QR code can carry readably.
      const link = props.slug ? `${baseUrl.replace(/#.*$/, '')}#/journey/${props.slug}` : encode(redacted, baseUrl);
      if (link.length > MAX_QR_TEXT) return { link, svg: null, geometry: null };
      const matrix = qrMatrix(link);
      // Rendered as real SVG elements, never as an HTML string: the site's
      // security test forbids injecting markup, and this keeps that promise.
      return { link, svg: qrSvg(matrix), geometry: qrGeometry(matrix) };
    } catch (error) {
      if (error instanceof QrTooLongError) return { link: '', svg: null, geometry: null };
      throw error;
    }
  }, [props.journey, props.encoder, props.slug, baseUrl]);

  const tooLong = result.svg === null;

  return (
    <div className="qr-share" data-testid="qr-share">
      <h4>{t('qr.title')}</h4>
      <p className="hint">{t('qr.hint')}</p>
      {tooLong ? (
        <p className="notice" role="status" data-testid="qr-too-long">
          {t('qr.tooLong')}
        </p>
      ) : (
        <QrSvg geometry={result.geometry} label={t('qr.title')} />
      )}
      {!tooLong ? (
        <button
          type="button"
          data-testid="qr-download"
          onClick={() => downloadTextFile(result.svg ?? '', 'packet-voyage-share.svg', 'image/svg+xml')}
        >
          {t('qr.download')}
        </button>
      ) : null}
    </div>
  );
}

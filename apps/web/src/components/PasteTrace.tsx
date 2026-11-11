import { useState } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { buildLocalJourney } from '../lib/local-journey.ts';
import { loadDatasets } from '../lib/datasets.ts';

const EXAMPLE_TRACE = `traceroute to www.example.org (203.0.113.80), 30 hops max, 60 byte packets
 1  gw.home.example (192.0.2.1)  1.204 ms  1.301 ms  1.402 ms
 2  bras-lyon.access.example.net (192.0.2.10)  4.812 ms  5.003 ms  4.910 ms
 3  ae1.par1.access.example.net (198.51.100.3)  9.104 ms  9.402 ms  9.211 ms
 4  ix-paris.transit.example.net (198.51.100.9)  9.902 ms  9.611 ms  10.404 ms
 5  xe-0.lon2.transit.example.net (198.51.100.21)  14.902 ms  15.204 ms  15.101 ms
 6  core-lon1.transit.example.net (198.51.100.22)  13.804 ms  14.002 ms  14.101 ms
 7  ae4.nyc1.transit.example.net (203.0.113.11)  88.402 ms  88.902 ms  89.004 ms
 8  edge-nyc2.transit.example.net (203.0.113.12)  86.904 ms  87.102 ms  87.203 ms
 9  gw.iad1.host.example.org (203.0.113.55)  92.304 ms  92.601 ms  92.402 ms
10  www.example.org (203.0.113.80)  91.704 ms  91.902 ms  92.003 ms
`;

/** Unreadable trace state (§12.2, VOY-F-02): first unknown line + formats. */
function PasteError({ line }: { line: string | null }) {
  const { t } = useI18n();
  return (
    <div className="paste-error" role="alert" data-testid="paste-error">
      <h3>{t('paste.errorTitle')}</h3>
      {line ? (
        <p>
          {t('paste.firstUnknown')} <code className="mono">{line}</code>
        </p>
      ) : null}
      <p>{t('paste.acceptedFormats')}</p>
      <pre className="paste-example mono">{EXAMPLE_TRACE.split('\n').slice(0, 4).join('\n')}</pre>
    </div>
  );
}

/** What the reader had to clean before understanding the paste — never silent. */
function CleaningNotice({ warnings }: { warnings: string[] }) {
  const { t } = useI18n();
  if (warnings.length === 0) return null;
  return (
    <p className="paste-warnings" role="status" data-testid="paste-warnings">
      {t('paste.warnings', { list: warnings.join(', ') })}
    </p>
  );
}

/**
 * Paste-a-trace (VOY-F-01, VOY-F-02, §12.2): a textarea; on submit the
 * journey is computed locally with name hints only — no request at all.
 * The unreadable case shows the first line not understood and the accepted
 * formats.
 */
export function PasteTrace({ onComputed }: { onComputed?: (journey: Journey) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [error, setError] = useState<{ line: string | null } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const submit = () => {
    setError(null);
    const result = buildLocalJourney(text, {
      tracedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    });
    // What the reader had to clean before understanding the paste (BOM, CRLF,
    // tabs…): told to the user, never fixed silently.
    setWarnings(result.warnings ?? []);
    if (!result.ok || !result.journey) {
      setError({ line: result.unknownLine });
      return;
    }
    onComputed?.(result.journey);
  };

  return (
    <section className="paste-trace" data-testid="paste-trace">
      <h2>{t('paste.title')}</h2>
      <CleaningNotice warnings={warnings} />
      <p className="paste-description">{t('paste.description')}</p>
      <label htmlFor="trace-input" className="sr-only">
        {t('paste.title')}
      </label>
      <textarea
        id="trace-input"
        className="paste-input mono"
        rows={10}
        value={text}
        placeholder={t('paste.placeholder')}
        onChange={(event) => setText(event.target.value)}
        data-testid="paste-input"
      />
      <div className="paste-actions">
        <button type="button" onClick={submit} data-testid="paste-submit">
          {t('paste.button')}
        </button>
        <button type="button" className="link-button" onClick={() => setText(EXAMPLE_TRACE)}>
          {t('paste.exampleButton')}
        </button>
      </div>
      {error ? <PasteError line={error.line} /> : null}
      <p className="paste-hint">{t('paste.cliHint')}</p>
    </section>
  );
}

/** Loads bundled datasets then computes, for callers that want the data. */
export async function computeWithDatasets(text: string): Promise<Journey | null> {
  const datasets = await loadDatasets();
  const result = buildLocalJourney(text, {
    tracedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    hints: datasets.hints.length > 0 ? datasets.hints : undefined,
  });
  return result.journey;
}

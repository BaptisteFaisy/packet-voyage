import { useState } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { computeUserJourney } from '../lib/user-journey.ts';

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

interface PasteState {
  text: string;
  busy: boolean;
  error: { line: string | null } | null;
  warnings: string[];
  setText: (value: string) => void;
  submit: () => void;
}

/**
 * The paste computation: the same pipeline the CLI runs (`computeUserJourney`),
 * with the honest exits — what the reader cleaned, and the first line it did not
 * understand. A computation that throws is reported, never swallowed.
 */
function usePasteCompute(onComputed?: (journey: Journey) => void): PasteState {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ line: string | null } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const submit = () => {
    setError(null);
    setBusy(true);
    void computeUserJourney(text, { tracedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') })
      .then((result) => {
        setWarnings(result.warnings);
        if (!result.ok || !result.journey) {
          setError({ line: result.unknownLine });
          return;
        }
        onComputed?.(result.journey);
      })
      .catch((cause: unknown) => setError({ line: (cause as Error).message }))
      .finally(() => setBusy(false));
  };

  return { text, busy, error, warnings, setText, submit };
}

/** The two actions: compute the journey, or fill the appendix B example. */
function PasteActions({ busy, onSubmit, onExample }: { busy: boolean; onSubmit: () => void; onExample: () => void }) {
  const { t } = useI18n();
  return (
    <div className="paste-actions">
      <button type="button" onClick={onSubmit} disabled={busy} data-testid="paste-submit">
        {t('paste.button')}
      </button>
      <button type="button" className="link-button" disabled={busy} onClick={onExample} data-testid="paste-example">
        {t('paste.exampleButton')}
      </button>
    </div>
  );
}

/**
 * Paste-a-trace (VOY-F-01, VOY-F-02, §12.2): a textarea; on submit the journey
 * is computed locally, in the browser, with the bundled datasets — no request
 * at all (VOY-N-01).
 */
export function PasteTrace({ onComputed }: { onComputed?: (journey: Journey) => void }) {
  const { t } = useI18n();
  const paste = usePasteCompute(onComputed);

  return (
    <section className="paste-trace" data-testid="paste-trace">
      <h2>{t('paste.title')}</h2>
      <CleaningNotice warnings={paste.warnings} />
      <p className="paste-description">{t('paste.description')}</p>
      <label htmlFor="trace-input" className="sr-only">
        {t('paste.title')}
      </label>
      <textarea
        id="trace-input"
        className="paste-input mono"
        rows={10}
        value={paste.text}
        placeholder={t('paste.placeholder')}
        onChange={(event) => paste.setText(event.target.value)}
        data-testid="paste-input"
      />
      <PasteActions busy={paste.busy} onSubmit={paste.submit} onExample={() => paste.setText(EXAMPLE_TRACE)} />
      {paste.error ? <PasteError line={paste.error.line} /> : null}
      <p className="paste-hint">{t('paste.cliHint')}</p>
    </section>
  );
}

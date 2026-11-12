/**
 * Import a `journey.json` from disk (§12.2, VOY-F-41 family).
 *
 * The command line writes enriched journeys; this is the door they come in
 * through: a file picker and a drop zone, both read with the browser's File API
 * (`lib/import-journey.ts`). The file never leaves the machine and the page
 * makes no request — the privacy notice says so out loud, because a user cannot
 * check that by watching.
 *
 * A file that is not a journey is content, not an error to swallow: the schema's
 * own list of problems is shown, so the user knows what to fix.
 */
import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import type { I18nKey } from '../i18n/en.ts';
import { readJourneyFile } from '../lib/import-journey.ts';
import type { ImportFailure, ImportFailureKind } from '../lib/import-journey.ts';
import { ImportDropZone } from './ImportDropZone.tsx';

const REASON_KEYS: Record<ImportFailureKind, I18nKey> = {
  unreadable: 'import.errorUnreadable',
  'invalid-json': 'import.errorNotJson',
  'not-a-journey': 'import.errorNotJourney',
  'too-large': 'import.errorTooLarge',
};

type Translate = ReturnType<typeof useI18n>['t'];

/** One readable sentence for the kind of failure, before the schema's list. */
function reasonText(failure: ImportFailure, t: Translate): string {
  const key = REASON_KEYS[failure.kind];
  if (failure.kind === 'too-large') {
    return t(key, { size: failure.size ?? 0, limit: failure.limit });
  }
  if (failure.kind === 'not-a-journey') return t(key);
  return t(key, { detail: failure.detail });
}

/** What the schema rejects, listed: the user can fix the file with it. */
function ImportIssues({ failure }: { failure: ImportFailure }) {
  const { t } = useI18n();
  return (
    <div className="import-error" role="alert" data-testid="import-error">
      <h3>{t('import.errorTitle')}</h3>
      <p data-testid="import-reason">{reasonText(failure, t)}</p>
      {failure.issues.length > 0 ? (
        <>
          <p className="hint">{t('import.issuesTitle')}</p>
          <ul className="import-issues mono" data-testid="import-issues">
            {failure.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="hint">{t('import.formats')}</p>
    </div>
  );
}

export interface ImportJourneyProps {
  /** Called with a journey that passed the schema; the caller opens it. */
  onImported: (journey: Journey, fileName: string) => void;
}

export function ImportJourney({ onImported }: ImportJourneyProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const accept = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      setFileName(file.name);
      setFailure(null);
      void readJourneyFile(file).then((result) => {
        if (result.ok) onImported(result.journey, file.name);
        else setFailure(result.failure);
      });
    },
    [onImported],
  );

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    accept(event.target.files?.[0]);
    // Cleared so picking the same file twice still reads it again.
    event.target.value = '';
  };

  return (
    <section className="import-journey" data-testid="import-journey">
      <h2>{t('import.title')}</h2>
      <p className="import-description">{t('import.description')}</p>
      <p className="import-privacy hint" data-testid="import-privacy">
        {t('import.privacy')}
      </p>
      <div className="import-controls">
        <label htmlFor="journey-file">{t('import.pickFile')}</label>
        <input
          id="journey-file"
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={onChange}
          data-testid="import-input"
        />
      </div>
      <ImportDropZone
        label={t('import.dropHint')}
        fileName={fileName}
        onFile={accept}
        onPick={() => inputRef.current?.click()}
      />
      {failure ? <ImportIssues failure={failure} /> : null}
    </section>
  );
}

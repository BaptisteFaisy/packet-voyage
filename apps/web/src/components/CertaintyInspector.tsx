/**
 * The certainty inspector (§5.4, §7.6): a real button that opens the detail of
 * one value — its level, the sentence that explains it, the sources that
 * founded it, and the band that says what stops us from knowing more.
 *
 * It carries no knowledge of its own: the caller names the value (`label`) and
 * states what is known about it, so the inspector can be mounted next to any
 * number on any screen. Inline-safe (a `span` root), so it can replace a level
 * badge inside a heading as well as sit in a paragraph.
 */
import { useId, useState } from 'react';
import type { Certainty } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import type { I18nValue } from '../i18n/context.tsx';
import { WhyUnknown } from './WhyUnknown.tsx';

type Translate = I18nValue['t'];
type TranslateKey = Parameters<Translate>[0];

export interface CertaintyInspectorProps {
  /** The level of the value the button stands for. */
  certainty: Certainty;
  /** The text of the button: the value as the reader sees it. */
  label: string;
  /** The sources that founded the value. */
  sources?: string[];
  /** Extra blockers, listed verbatim after the shared ones. */
  blockers?: string[];
}

const NO_SOURCES: string[] = [];

const LEVEL_KEY: Record<Certainty, TranslateKey> = {
  measured: 'certainty.measured',
  inferred: 'certainty.inferred',
  assumed: 'certainty.assumed',
};

const PHRASE_KEY: Record<Certainty, TranslateKey> = {
  measured: 'inspector.measured',
  inferred: 'inspector.inferred',
  assumed: 'inspector.assumed',
};

const BLOCK_STYLE = { display: 'block' } as const;

/** The sentence that explains the level; an inferred value names its sources. */
function phraseOf(certainty: Certainty, sources: string[], t: Translate): string {
  if (certainty !== 'inferred') return t(PHRASE_KEY[certainty]);
  return t('inspector.inferred', { sources: sources.join(', ') || '—' });
}

/** The founding sources, one line each. Absent when nothing founded the value. */
function SourceList(props: { sources: string[] }) {
  const { t } = useI18n();
  return (
    <span className="certainty-inspector-sources" data-testid="certainty-inspector-sources" style={BLOCK_STYLE}>
      <span className="certainty-inspector-heading" style={BLOCK_STYLE}>
        {t('inspector.sources')}
      </span>
      {props.sources.map((source, index) => (
        <span
          key={`${index}-${source}`}
          className="certainty-inspector-source mono"
          data-testid={`certainty-inspector-source-${index}`}
          style={BLOCK_STYLE}
        >
          {source}
        </span>
      ))}
    </span>
  );
}

/** The opened panel: level, explaining sentence, sources, and what blocks us. */
function InspectorPanel(props: {
  certainty: Certainty;
  sources: string[];
  blockers: string[];
  panelId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { certainty, sources, blockers, panelId, onClose } = props;
  return (
    <span
      className="certainty-inspector-panel"
      id={panelId}
      role="group"
      aria-label={t('inspector.title')}
      data-testid="certainty-inspector-panel"
      style={BLOCK_STYLE}
    >
      <span className="card-line" data-testid="certainty-inspector-level" style={BLOCK_STYLE}>
        {t('inspector.title')} <span className="level-badge">{t(LEVEL_KEY[certainty])}</span>
      </span>
      <span className="card-line" data-testid="certainty-inspector-phrase" style={BLOCK_STYLE}>
        {phraseOf(certainty, sources, t)}
      </span>
      {sources.length > 0 ? <SourceList sources={sources} /> : null}
      <WhyUnknown
        certainty={certainty}
        sources={sources}
        blockers={blockers}
        testId="certainty-inspector-why"
      />
      <button
        type="button"
        className="certainty-inspector-close"
        data-testid="certainty-inspector-close"
        onClick={onClose}
      >
        {t('inspector.close')}
      </button>
    </span>
  );
}

export function CertaintyInspector(props: CertaintyInspectorProps) {
  const { certainty, label, sources = NO_SOURCES, blockers = NO_SOURCES } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <span className="certainty-inspector" data-testid="certainty-inspector">
      <button
        type="button"
        className="level-badge certainty-inspector-button"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="certainty-inspector-button"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <InspectorPanel
          certainty={certainty}
          sources={sources}
          blockers={blockers}
          panelId={panelId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </span>
  );
}

/**
 * CopyButton — a real <button> that hands a string to the clipboard and
 * announces the outcome.
 *
 * The words shown on the button come from the props: the caller owns the
 * translation, this file keeps no user-facing copy of its own beyond the
 * fallback used when a prop is missing.
 *
 * When the browser refuses the copy (no clipboard API, denied permission),
 * the button stays quiet instead of claiming a copy that did not happen.
 */
import { useEffect, useRef, useState } from 'react';

export interface CopyButtonProps {
  /** The exact string handed to the clipboard. */
  text: string;
  /** Idle label, translated by the caller. */
  label?: string;
  /** Label shown right after a successful copy, translated by the caller. */
  copiedLabel?: string;
  /** data-testid of the button; defaults to "copy-button". */
  testId?: string;
  /** Extra class on the button itself. */
  className?: string;
}

/** How long the "copied" label stays up, in milliseconds. */
export const COPY_FEEDBACK_MS = 2000;

/** Fallback words, used only when the caller passes no label. */
const DEFAULT_LABEL = 'Copy';
const DEFAULT_COPIED_LABEL = 'Copied';

/**
 * Legacy path for browsers without the async clipboard API: a hidden field
 * holding the text, selected and copied by the document.
 */
function copyWithSelection(text: string): boolean {
  if (typeof document === 'undefined') return false;
  if (typeof document.execCommand !== 'function') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * Write to the clipboard. Returns false when nothing could be copied, so
 * the caller can stay silent instead of lying.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Permission refused: try the legacy path before giving up.
    }
  }
  return copyWithSelection(text);
}

export function CopyButton(props: CopyButtonProps): JSX.Element {
  const { text, testId = 'copy-button', className } = props;
  const label = props.label ?? DEFAULT_LABEL;
  const copiedLabel = props.copiedLabel ?? DEFAULT_COPIED_LABEL;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  async function onCopy(): Promise<void> {
    const done = await copyToClipboard(text);
    if (!done) return;
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setCopied(false);
    }, COPY_FEEDBACK_MS);
  }

  return (
    <span className="copy-button">
      <button
        type="button"
        className={className}
        data-testid={testId}
        aria-label={copied ? copiedLabel : label}
        onClick={() => void onCopy()}
      >
        {copied ? copiedLabel : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite" data-testid={`${testId}-status`}>
        {copied ? copiedLabel : ''}
      </span>
    </span>
  );
}

/**
 * The drop half of the import door: a zone that takes a file dropped on it, and
 * is reachable by keyboard (Enter or Space opens the picker), because a drop
 * target nobody can reach without a mouse is not an entry point.
 * The file itself is read by `lib/import-journey.ts`, with the File API only.
 */
import { useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';

export interface ImportDropZoneProps {
  label: string;
  /** Name of the last file offered, so the user sees what was taken. */
  fileName: string | null;
  onFile: (file: File | null | undefined) => void;
  onPick: () => void;
}

export function ImportDropZone({ label, fileName, onFile, onPick }: ImportDropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFile(event.dataTransfer?.files?.[0]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onPick();
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  return (
    <div
      className={dragging ? 'import-dropzone dragging' : 'import-dropzone'}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onPick}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="import-dropzone"
    >
      {label}
      {fileName ? <span className="hint"> — {fileName}</span> : null}
    </div>
  );
}

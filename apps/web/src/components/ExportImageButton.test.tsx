// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import type { ExportedImage } from '../lib/export-image.ts';
import { ExportImageButton } from './ExportImageButton.tsx';

const IMAGE: ExportedImage = {
  blob: new Blob(['png-bytes'], { type: 'image/png' }),
  fileName: 'packet-voyage-www.example.org-20261112.png',
  alt: 'Map of a journey to www.example.org: at least 6,655 km.',
};

function stubDownload() {
  const create = vi.fn(() => 'blob:mock');
  const revoke = vi.fn();
  vi.stubGlobal('URL', Object.assign(globalThis.URL, { createObjectURL: create, revokeObjectURL: revoke }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { create, revoke, click };
}

describe('ExportImageButton (VOY-F-40)', () => {
  it('offers an accessible button, idle at first', () => {
    renderWithProviders(<ExportImageButton journey={SAMPLE_JOURNEY} masses={[]} cables={[]} />);
    const button = screen.getByTestId('export-image-button');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.textContent).toContain('Export image');
  });

  it('encodes, downloads through a blob URL, then shows the replacement text', async () => {
    const { create, revoke, click } = stubDownload();
    const encoder = vi.fn(async () => IMAGE);
    renderWithProviders(
      <ExportImageButton journey={SAMPLE_JOURNEY} masses={[]} cables={[]} encoder={encoder} />,
    );
    fireEvent.click(screen.getByTestId('export-image-button'));
    await waitFor(() => expect(screen.getByTestId('export-image-alt')).toBeTruthy());
    expect(encoder).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(IMAGE.blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:mock');
    expect(screen.getByTestId('export-image-alt').textContent).toContain(IMAGE.alt);
    expect(screen.getByTestId('export-image-alt').textContent).toContain('at least 6,655 km');
    vi.unstubAllGlobals();
    click.mockRestore();
  });

  it('announces a failure instead of failing silently', async () => {
    stubDownload();
    const encoder = vi.fn(async () => {
      throw new Error('no 2D context');
    });
    renderWithProviders(
      <ExportImageButton journey={SAMPLE_JOURNEY} masses={[]} cables={[]} encoder={encoder} />,
    );
    fireEvent.click(screen.getByTestId('export-image-button'));
    await waitFor(() => expect(screen.getByTestId('export-image-error')).toBeTruthy());
    expect(screen.getByTestId('export-image-error').getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('export-image-error').textContent).toContain('could not be produced');
    vi.unstubAllGlobals();
  });

  it('renders the French label when the language is French', () => {
    renderWithProviders(<ExportImageButton journey={SAMPLE_JOURNEY} masses={[]} cables={[]} />, {
      language: 'fr',
    });
    expect(screen.getByTestId('export-image-button').textContent).toContain('Exporter');
  });
});

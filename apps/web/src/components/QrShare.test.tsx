// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import { QrShare } from './QrShare.tsx';

describe('QrShare', () => {
  it('renders the QR of a redacted share link, generated in the browser', () => {
    renderWithProviders(<QrShare journey={SAMPLE_JOURNEY} baseUrl="https://example.test/" slug="ocean-crossing" />);
    const image = screen.getByTestId('qr-image');
    expect(image.tagName.toLowerCase()).toBe('svg');
    expect(image.querySelector('path')?.getAttribute('d')).toContain('M');
    expect(screen.getByTestId('qr-share').textContent).toContain('QR code');
  });

  it('redacts before encoding: the link never carries the private hops', () => {
    const encoder = vi.fn((journey: { hops: { class: string }[] }) => `https://x/?h=${journey.hops.map((h) => h.class).join(',')}`);
    renderWithProviders(
      <QrShare journey={SAMPLE_JOURNEY} baseUrl="https://example.test/" encoder={encoder as never} />,
    );
    const encoded = encoder.mock.calls[0]?.[0] as { hops: { class: string }[] };
    expect(encoded.hops.every((hop) => hop.class === 'documentation' || hop.class === 'public')).toBe(true);
    expect(encoded.hops.some((hop) => hop.class === 'private')).toBe(false);
  });

  it('offers the SVG for download, without leaving the browser', () => {
    const create = vi.fn(() => 'blob:mock');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(globalThis.URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderWithProviders(<QrShare journey={SAMPLE_JOURNEY} baseUrl="https://example.test/" slug="ocean-crossing" />);
    fireEvent.click(screen.getByTestId('qr-download'));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:mock');
    vi.unstubAllGlobals();
    click.mockRestore();
  });

  it('says so when the link is too long for a QR code', () => {
    const encoder = vi.fn(() => `https://example.test/#j=${'x'.repeat(1200)}`);
    renderWithProviders(
      <QrShare journey={SAMPLE_JOURNEY} baseUrl="https://example.test/" encoder={encoder as never} />,
    );
    expect(screen.getByTestId('qr-too-long').textContent).toContain('too long');
    expect(screen.queryByTestId('qr-image')).toBeNull();
  });
});

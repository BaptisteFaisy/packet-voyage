// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Journey } from '@packet-voyage/schema';
import { renderWithProviders } from '../test-utils.tsx';
import { PasteTrace } from './PasteTrace.tsx';

const GARBAGE = 'bonjour je ne suis pas une trace\n42 potatoes';

const VALID_TRACE = [
  'traceroute to www.example.org (203.0.113.80), 30 hops max, 60 byte packets',
  ' 1  gw.home.example (192.0.2.1)  1.204 ms  1.301 ms  1.402 ms',
  ' 2  ae1.par1.access.example.net (198.51.100.3)  9.104 ms  9.402 ms  9.211 ms',
  ' 3  www.example.org (203.0.113.80)  91.704 ms  91.902 ms  92.003 ms',
].join('\n');

/** Paste, submit, and wait for the computation to settle. */
async function paste(value: string, onComputed: (journey: Journey) => void = () => {}): Promise<void> {
  renderWithProviders(<PasteTrace onComputed={onComputed} />);
  fireEvent.change(screen.getByTestId('paste-input'), { target: { value } });
  fireEvent.click(screen.getByTestId('paste-submit'));
  await waitFor(() => expect(screen.getByTestId('paste-submit')).toBeTruthy());
}

describe('PasteTrace', () => {
  it('VOY-F-02 reports the first unknown line and the accepted formats for garbage input', async () => {
    await paste(GARBAGE);
    await waitFor(() => expect(screen.getByTestId('paste-error')).toBeTruthy());
    const error = screen.getByTestId('paste-error');
    expect(error.textContent).toContain('bonjour je ne suis pas une trace');
    expect(error.textContent).toContain('traceroute');
    expect(error.textContent).toContain('tracert');
    expect(error.textContent).toContain('mtr');
    expect(error.textContent).toContain('RIPE Atlas');
  });

  it('VOY-N-10 a valid trace computes a journey locally, without any request', async () => {
    const onComputed = vi.fn();
    await paste(VALID_TRACE, onComputed);
    await waitFor(() => expect(onComputed).toHaveBeenCalledTimes(1));
    const journey = onComputed.mock.calls[0]?.[0] as Journey;
    expect(journey.hops.length).toBe(3);
    expect(journey.hops[1]?.location?.city).toBe('Paris');
    expect(journey.summary.rtt_ms).not.toBeNull();
  });

  it('VOY-F-06 name hints locate hops without any network request (P8)', async () => {
    const onComputed = vi.fn();
    await paste(VALID_TRACE, onComputed);
    await waitFor(() => expect(onComputed).toHaveBeenCalledTimes(1));
    const journey = onComputed.mock.calls[0]?.[0] as Journey;
    const located = journey.hops.filter((hop) => hop.location !== null);
    expect(located.length).toBeGreaterThanOrEqual(1);
    for (const hop of located) {
      expect(hop.location?.sources).toContain('name-hint');
    }
  });

  it('VOY-F-30 a pasted trace gets the whole pipeline, not a reduced one', async () => {
    const onComputed = vi.fn();
    await paste(VALID_TRACE, onComputed);
    await waitFor(() => expect(onComputed).toHaveBeenCalledTimes(1));
    const journey = onComputed.mock.calls[0]?.[0] as Journey;
    // The reduced copy of the pipeline the site used to run produced none of
    // these: no log, no credits, and a summary without light floor.
    expect((journey.story ?? []).length).toBeGreaterThan(0);
    expect(journey.credits.length).toBeGreaterThan(0);
    expect(journey.summary.light_floor_ms).not.toBeNull();
  });
});

describe('VOY-F-02 the reader says what it cleaned', () => {
  it('reports a BOM and tabs instead of fixing them silently', async () => {
    // A <textarea> sanitises CRLF to LF (HTML spec), so the noise that survives
    // a real paste is the BOM and the tab separators.
    const noisy = `\uFEFF${VALID_TRACE.replace(/ {2}/g, '\t')}`;
    await paste(noisy);
    await waitFor(() => expect(screen.getByTestId('paste-warnings')).toBeTruthy());
    const notice = screen.getByTestId('paste-warnings').textContent ?? '';
    expect(notice).toMatch(/byte-order mark/i);
    expect(notice).toMatch(/tabs/i);
  });
});

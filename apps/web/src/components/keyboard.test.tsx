// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, setStoredPreferences } from '../test-utils.tsx';
import { JourneyView } from './JourneyView.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

beforeEach(() => {
  setStoredPreferences({ animations: false });
});

describe('JourneyView keyboard navigation (VOY-F-34, VOY-N-08)', () => {
  it('VOY-F-34 arrow keys move the selected hop and announce it', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    // Nothing open yet.
    expect(screen.queryByTestId('detail-panel')).toBeNull();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByTestId('hop-card-2')).toBeTruthy();
    const live = screen.getByTestId('live-region');
    expect(live.textContent).toContain('Hop 2');
    expect(live.getAttribute('aria-live')).toBe('polite');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByTestId('hop-card-3')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByTestId('hop-card-2')).toBeTruthy();
  });

  it('VOY-F-34 Escape closes the open card', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    fireEvent.click(screen.getByTestId('hop-item-4'));
    expect(screen.getByTestId('hop-card-4')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('detail-panel')).toBeNull();
  });

  it('VOY-F-34 arrows inside the hop list move the roving focus', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    const first = screen.getByTestId('hop-item-1');
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('hop-item-2').getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByTestId('hop-item-2').getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('hop-item-1').getAttribute('tabindex')).toBe('-1');
  });

  it('VOY-F-34 clicking a segment hit target on the map opens the crossing card', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    fireEvent.click(screen.getByTestId('map-segment-6-7'));
    expect(screen.getByTestId('crossing-card-6-7')).toBeTruthy();
    expect(screen.getByTestId('crossing-honesty').textContent).toContain(
      'Nothing in the measurement says which one carried the packet.',
    );
  });

  it('VOY-N-08 aria-live region exists and reacts to hop changes', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    const live = screen.getByTestId('live-region');
    expect(live.getAttribute('role')).toBe('status');
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect((live.textContent ?? '').length).toBeGreaterThan(0);
  });
});

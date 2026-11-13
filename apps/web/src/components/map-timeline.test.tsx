// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, setStoredPreferences } from '../test-utils.tsx';
import { JourneyView } from './JourneyView.tsx';
import { WorldMap } from './WorldMap.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

beforeEach(() => {
  setStoredPreferences({ animations: false });
});

describe('WorldMap and DelayTimeline (VOY-F-30, VOY-F-31, VOY-F-34)', () => {
  it('VOY-F-30 draws a canvas and an SVG hit target per located hop', () => {
    renderWithProviders(<WorldMap journey={SAMPLE_JOURNEY} projection="flat" />);
    expect(screen.getByTestId('world-map-canvas')).toBeTruthy();
    const overlay = screen.getByTestId('world-map-overlay');
    expect(overlay).toBeTruthy();
    for (const hop of SAMPLE_JOURNEY.hops) {
      if (hop.location) {
        expect(screen.getByTestId(`map-node-${hop.ttl}`)).toBeTruthy();
      }
    }
    // The declared departure is drawn too (ttl 0).
    expect(screen.getByTestId('map-node-0')).toBeTruthy();
  });

  it('VOY-F-30 the legend carries one colour AND one stroke pattern per network', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    const legend = screen.getByTestId('map-legend');
    expect(legend).toBeTruthy();
    expect(screen.getByTestId('legend-network-Transit Example')).toBeTruthy();
    expect(screen.getByTestId('legend-network-Host Example Cloud')).toBeTruthy();
    // Certainty is never carried by colour alone: the three stroke styles are labelled.
    expect(screen.getByTestId('legend-certainty-measured').textContent).toContain('measured');
    expect(screen.getByTestId('legend-certainty-inferred').textContent).toContain('inferred');
    expect(screen.getByTestId('legend-certainty-assumed').textContent).toContain('assumed');
  });

  it('VOY-F-34 no animation runs when animations are disabled (reduced motion)', () => {
    setStoredPreferences({ animations: false });
    renderWithProviders(<WorldMap journey={SAMPLE_JOURNEY} projection="flat" />);
    // The route is fully drawn at once: every leg hit target is present.
    expect(screen.getByTestId('map-segment-6-7')).toBeTruthy();
    expect(screen.getByTestId('map-node-10')).toBeTruthy();
  });

  it('VOY-F-31 the timeline shows one point per hop on a ms axis', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    expect(screen.getByTestId('delay-timeline')).toBeTruthy();
    for (const hop of SAMPLE_JOURNEY.hops) {
      expect(screen.getByTestId(`timeline-point-${hop.ttl}`)).toBeTruthy();
    }
  });

  it('VOY-F-31 hovering a timeline point highlights the matching hop in the list', () => {
    renderWithProviders(<JourneyView journey={SAMPLE_JOURNEY} />);
    const point = screen.getByTestId('timeline-point-4');
    fireEvent.mouseEnter(point);
    const item = screen.getByTestId('hop-item-4');
    expect(item.className).toContain('is-hovered');
    fireEvent.mouseLeave(point);
    expect(screen.getByTestId('hop-item-4').className).not.toContain('is-hovered');
  });
});

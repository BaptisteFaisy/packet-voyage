// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { RoadmapTable } from './RoadmapTable.tsx';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';

describe('RoadmapTable', () => {
  it('VOY-F-33 contains every hop of the fixture, in hop order', () => {
    renderWithProviders(<RoadmapTable journey={SAMPLE_JOURNEY} />);
    const table = screen.getByTestId('roadmap-table');
    expect(table.tagName).toBe('TABLE');
    for (const hop of SAMPLE_JOURNEY.hops) {
      const row = screen.getByTestId(`roadmap-row-hop-${hop.ttl}`);
      expect(row).toBeTruthy();
      expect(row.textContent).toContain(hop.replies[0]?.ip ?? '*');
    }
    const rows = screen.getAllByRole('row');
    // header + every hop + every segment
    expect(rows.length).toBe(1 + SAMPLE_JOURNEY.hops.length + SAMPLE_JOURNEY.segments.length);
  });

  it('VOY-F-33 contains every segment of the fixture with an "at least" distance', () => {
    renderWithProviders(<RoadmapTable journey={SAMPLE_JOURNEY} />);
    for (const segment of SAMPLE_JOURNEY.segments) {
      const row = screen.getByTestId(`roadmap-row-seg-${segment.from_ttl}-${segment.to_ttl}`);
      expect(row).toBeTruthy();
      if (segment.geodesic_km > 0) {
        expect(row.textContent).toContain('at least');
      }
    }
  });

  it('VOY-F-33 the sea crossing row names its compatible cables count', () => {
    renderWithProviders(<RoadmapTable journey={SAMPLE_JOURNEY} />);
    const atlantic = screen.getByTestId('roadmap-row-seg-6-7');
    expect(atlantic.textContent).toContain('sea');
    expect(atlantic.textContent).toContain('5,570');
    expect(atlantic.textContent).toContain('compatible cables: 3');
  });

  it('VOY-N-08 the table is screen-reader friendly: headers, scope and caption', () => {
    renderWithProviders(<RoadmapTable journey={SAMPLE_JOURNEY} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThanOrEqual(7);
    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders.length).toBe(
      SAMPLE_JOURNEY.hops.length + SAMPLE_JOURNEY.segments.length,
    );
    expect(screen.getByRole('table').querySelector('caption')).toBeTruthy();
  });
});

/**
 * The vendored datasets, loaded once per component that needs them (§5.9):
 * the landmasses and the cables. Nothing is fetched — they are bundled assets,
 * which is what keeps the site at zero request after load (VOY-N-01).
 */
import { useEffect, useState } from 'react';
import type { Cable, Landmass } from '@packet-voyage/schema';
import { loadDatasets } from '../lib/datasets.ts';

export interface JourneyDatasets {
  masses: Landmass[];
  cables: Cable[];
}

export function useJourneyDatasets(): JourneyDatasets {
  const [data, setData] = useState<JourneyDatasets>({ masses: [], cables: [] });
  useEffect(() => {
    let alive = true;
    void loadDatasets().then((ds) => {
      if (alive) setData({ masses: ds.masses, cables: ds.cables });
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

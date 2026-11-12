/**
 * The provenance sheets of the vendored datasets, loaded once (VOY-F-48,
 * VOY-N-11). One hook for every caller: the sources page and the catalogue's
 * proof line read the same rows, computed the same way.
 */
import { useEffect, useState } from 'react';
import { loadDatasets } from '../lib/datasets.ts';
import { provenanceRows } from '../lib/provenance.ts';
import type { ProvenanceRow } from '../lib/provenance.ts';

export interface ProvenanceData {
  rows: ProvenanceRow[];
  loaded: boolean;
}

export function useProvenanceData(): ProvenanceData {
  const [rows, setRows] = useState<ProvenanceRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadDatasets().then((datasets) => {
      if (!alive) return;
      setRows(provenanceRows(datasets.provenance, Date.now()));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { rows, loaded };
}

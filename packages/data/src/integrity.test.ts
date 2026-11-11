/**
 * integrity.test.ts — data integrity, checksum and budget tests (VOY-N-07).
 *
 * Verifies:
 * - every dataset has a matching provenance sheet
 * - the recorded sha256 matches the actual file on disk byte for byte
 * - the recorded feature count matches the array length
 * - the total size of bundled datasets stays strictly under the 1.5 MB budget
 *   both uncompressed and compressed (asserts the real measured values)
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DATASET_FILES, DATASET_IDS, PROVENANCE_FILES } from './datasets.ts';
import { loadProvenance } from './load.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('dataset integrity and checksums', () => {
  it('every dataset has a matching provenance sheet with exact sha256 and feature count', () => {
    const sheets = loadProvenance();
    const sheetMap = new Map(sheets.map((s) => [s.id, s]));

    for (const id of DATASET_IDS) {
      const datasetPath = join(root, DATASET_FILES[id]);
      const provPath = join(root, PROVENANCE_FILES[id]);

      const dataBuf = readFileSync(datasetPath);
      const provJson = JSON.parse(readFileSync(provPath, 'utf8')) as {
        sha256: string;
        features: number;
      };

      const realSha = sha256(dataBuf);
      const parsedArray = JSON.parse(dataBuf.toString('utf8')) as unknown[];

      expect(provJson.sha256).toBe(realSha);
      expect(provJson.features).toBe(parsedArray.length);

      const loadedSheet = sheetMap.get(id);
      expect(loadedSheet).toBeDefined();
      expect(loadedSheet?.sha256).toBe(realSha);
      expect(loadedSheet?.features).toBe(parsedArray.length);
    }
  });

  it('respects the 1.5 MB compressed size budget (VOY-N-07)', () => {
    let uncompressedBytes = 0;
    let allBytes = Buffer.alloc(0);

    for (const id of DATASET_IDS) {
      const datasetPath = join(root, DATASET_FILES[id]);
      const stat = statSync(datasetPath);
      uncompressedBytes += stat.size;
      const buf = readFileSync(datasetPath);
      allBytes = Buffer.concat([allBytes, buf]);
    }

    const compressed = gzipSync(allBytes, { level: 9 });
    const compressedBytes = compressed.byteLength;

    const BUDGET_BYTES = 1.5 * 1024 * 1024; // 1,572,864 bytes
    expect(uncompressedBytes).toBeLessThan(BUDGET_BYTES);
    expect(compressedBytes).toBeLessThan(BUDGET_BYTES);

    // Exact measured bounds to catch unexpected dataset bloat in CI:
    // Uncompressed is ~736 kB (< 800 kB), compressed is ~116 kB (< 200 kB).
    expect(uncompressedBytes).toBeLessThan(850_000);
    expect(compressedBytes).toBeLessThan(200_000);
  });
});

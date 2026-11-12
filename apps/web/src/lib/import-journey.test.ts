// @vitest-environment jsdom
/**
 * The file door itself: the File API only, and every failure comes back as
 * content (kind + detail + the schema's own list of problems).
 */
import { describe, expect, it } from 'vitest';
import { parseJourney } from '@packet-voyage/schema';
import oceanCrossing from '../../../../gallery/ocean-crossing/journey.json';
import { MAX_IMPORT_BYTES, readFileText, readJourneyFile } from './import-journey.ts';

function fileNamed(name: string, text: string): File {
  return new File([text], name, { type: 'application/json' });
}

describe('readJourneyFile', () => {
  it('validates a real journey.json and hands it back whole', async () => {
    const result = await readJourneyFile(fileNamed('journey.json', JSON.stringify(oceanCrossing)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journey).toEqual(parseJourney(JSON.stringify(oceanCrossing)));
  });

  it('refuses a file too large to open, and says the limit', async () => {
    const huge = fileNamed('huge.json', 'x'.repeat(MAX_IMPORT_BYTES + 1));
    const result = await readJourneyFile(huge);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('too-large');
    expect(result.failure.size).toBe(MAX_IMPORT_BYTES + 1);
    expect(result.failure.limit).toBe(MAX_IMPORT_BYTES);
  });

  it('calls a text file invalid JSON, with the parser detail', async () => {
    const result = await readJourneyFile(fileNamed('trace.txt', 'traceroute to example.org\n'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('invalid-json');
    expect(result.failure.detail.length).toBeGreaterThan(0);
  });

  it('calls a JSON that is not a journey by its name, and lists the problems', async () => {
    const result = await readJourneyFile(fileNamed('other.json', '{"version":2}'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('not-a-journey');
    expect(result.failure.issues.length).toBeGreaterThan(0);
    expect(result.failure.issues.join(' ')).toContain('version');
  });
});

describe('readFileText', () => {
  it('reads the bytes on this machine, through the File API', async () => {
    const text = await readFileText(fileNamed('small.json', '{"version":1}'));
    expect(text).toBe('{"version":1}');
  });
});

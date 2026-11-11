import { describe, expect, it } from 'vitest';
import { checkVocabulary, FORBIDDEN_PATTERNS } from './vocabulary.ts';

describe('vocabulary (§5.4)', () => {
  const forbidden = [
    'Your packet travelled through cable MAREA.',
    'The route took the cable to New York.',
    'Your packet crossed the Atlantic via this cable.',
    'It went through cable Apollo.',
    'Countries your data crossed: FR, GB, US.',
    'The router is located in Paris.',
    'The journey covers 6,655 km of cable.',
  ];

  const allowed = [
    'Compatible cables for this crossing: Example A, Example B.',
    'Likely in Paris (2 sources agree).',
    'At least 6,655 km.',
    'Countries where a hop was located: FR, GB, US.',
    'Not located.',
    'Crossing — Sea crossing. At least 5,570 km as the crow flies, 73.1 ms later.',
    'Paris, France (likely). 9.6 ms after departure.',
  ];

  it('rejects every wording the specification forbids', () => {
    for (const text of forbidden) {
      expect(checkVocabulary(text).ok, text).toBe(false);
    }
  });

  it('accepts every wording the specification imposes', () => {
    for (const text of allowed) {
      const report = checkVocabulary(text);
      expect(report.violations, text).toEqual([]);
      expect(report.ok, text).toBe(true);
    }
  });

  it('keeps at least the claims of §5.4 in the pattern list', () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(8);
  });
});

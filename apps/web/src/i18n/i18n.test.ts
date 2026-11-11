import { describe, expect, it } from 'vitest';
import { EN_KEYS } from './en.ts';
import { FR_KEYS } from './fr.ts';

describe('i18n dictionaries (VOY-N-09)', () => {
  it('VOY-N-09 en and fr export exactly the same key set', () => {
    const enKeys = Object.keys(EN_KEYS).sort();
    const frKeys = Object.keys(FR_KEYS).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it('VOY-N-09 no value is empty in either language', () => {
    for (const [key, value] of Object.entries(EN_KEYS)) {
      expect(value.trim().length, `en.${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(FR_KEYS)) {
      expect(value.trim().length, `fr.${key}`).toBeGreaterThan(0);
    }
  });

  it('VOY-N-09 English is the default: every key exists in EN_KEYS', () => {
    expect(Object.keys(EN_KEYS).length).toBeGreaterThan(50);
  });

  it('VOY-N-09 placeholders match between languages', () => {
    const placeholderOf = (value: string): string[] =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
    for (const [key, enValue] of Object.entries(EN_KEYS)) {
      const frValue = FR_KEYS[key as keyof typeof FR_KEYS];
      expect(placeholderOf(frValue ?? ''), `placeholders of ${key}`).toEqual(placeholderOf(enValue));
    }
  });
});

import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consentPromptText, readConsent, THIRD_PARTY_SERVICES, writeConsent } from './consent.ts';

describe('VOY-F-13 consent', () => {
  it('VOY-F-13 defaults to not granted when file is missing', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-consent-'));
    try {
      expect(readConsent(dir)).toEqual({ granted: false, services: [], grantedAt: null });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('VOY-F-13 persists granted consent and allows revocation', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-consent-'));
    try {
      writeConsent(dir, {
        granted: true,
        services: [...THIRD_PARTY_SERVICES],
        grantedAt: '2026-11-11T10:00:00Z',
      });
      expect(readConsent(dir).granted).toBe(true);

      writeConsent(dir, { granted: false, services: [], grantedAt: null });
      expect(readConsent(dir).granted).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('VOY-F-13 prompt text names services and states only public addresses are sent', () => {    const text = consentPromptText();
    for (const svc of THIRD_PARTY_SERVICES) {
      expect(text).toContain(svc);
    }
    expect(text.toLowerCase()).toContain('public');
    expect(text.toLowerCase()).toContain('never');
  });
});

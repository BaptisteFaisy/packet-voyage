import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { HopClass } from '@packet-voyage/schema';
import {
  classifyAddress,
  inPrefix,
  isDocumentationAddress,
  isPublicAddress,
  parseAddress,
} from './index.ts';

function ipv4FromBytes(a: number, b: number, c: number, d: number): string {
  return `${a}.${b}.${c}.${d}`;
}

function ipv6Uncompressed(groups: readonly number[]): string {
  return groups.map((g) => g.toString(16).padStart(4, '0')).join(':');
}

function ipv6CompressedWithZeroes(groups: readonly number[]): string {
  return groups.map((g) => g.toString(16)).join(':').replace(/(?:^|:)0(?::0)+(?::|$)/, '::');
}

function rangeArbitraries() {
  const byte = fc.integer({ min: 0, max: 255 });
  const hex16 = fc.integer({ min: 0, max: 0xffff });
  return {
    rfc1918: fc.oneof(
      fc.tuple(byte, byte, byte).map(([b, c, d]) => ipv4FromBytes(10, b, c, d)),
      fc.tuple(fc.integer({ min: 16, max: 31 }), byte, byte).map(([b, c, d]) => ipv4FromBytes(172, b, c, d)),
      fc.tuple(byte, byte).map(([c, d]) => ipv4FromBytes(192, 168, c, d)),
    ),
    ula: fc.array(hex16, { minLength: 7, maxLength: 7 }).map((r) => [0xfc00 | ((r[0] ?? 0) & 0x01ff), ...r]),
    cgnat: fc.tuple(fc.integer({ min: 64, max: 127 }), byte, byte).map(([b, c, d]) => ipv4FromBytes(100, b, c, d)),
    linkLocalV4: fc.tuple(byte, byte).map(([c, d]) => ipv4FromBytes(169, 254, c, d)),
    linkLocalV6: fc.array(hex16, { minLength: 7, maxLength: 7 }).map((r) => [0xfe80 | ((r[0] ?? 0) & 0x003f), ...r]),
    loopbackV4: fc.tuple(byte, byte, byte).map(([b, c, d]) => ipv4FromBytes(127, b, c, d)),
    docV4: fc.oneof(
      byte.map((d) => ipv4FromBytes(192, 0, 2, d)),
      byte.map((d) => ipv4FromBytes(198, 51, 100, d)),
      byte.map((d) => ipv4FromBytes(203, 0, 113, d)),
    ),
    docV6: fc.array(hex16, { minLength: 6, maxLength: 6 }).map((r) => [0x2001, 0x0db8, ...r]),
    multicastV4: fc.tuple(fc.integer({ min: 224, max: 239 }), byte, byte, byte).map(([a, b, c, d]) => ipv4FromBytes(a, b, c, d)),
    multicastV6: fc.array(hex16, { minLength: 7, maxLength: 7 }).map((r) => [0xff00 | ((r[0] ?? 0) & 0x00ff), ...r]),
    reservedV4: fc.tuple(fc.integer({ min: 240, max: 255 }), byte, byte, byte).map(([a, b, c, d]) => ipv4FromBytes(a, b, c, d)),
  };
}

function assertIpv4AndIpv6Ranges() {
  const arbs = rangeArbitraries();
  fc.assert(fc.property(arbs.rfc1918, (ip) => { expect(classifyAddress(ip)).toBe('private'); }));
  fc.assert(fc.property(arbs.ula, (g) => {
    expect(classifyAddress(ipv6Uncompressed(g))).toBe('private');
    expect(classifyAddress(ipv6CompressedWithZeroes(g))).toBe('private');
  }));
  fc.assert(fc.property(arbs.cgnat, (ip) => { expect(classifyAddress(ip)).toBe('cgnat'); }));
  fc.assert(fc.property(arbs.linkLocalV4, (ip) => { expect(classifyAddress(ip)).toBe('link-local'); }));
  fc.assert(fc.property(arbs.linkLocalV6, (g) => { expect(classifyAddress(ipv6CompressedWithZeroes(g))).toBe('link-local'); }));
  fc.assert(fc.property(arbs.loopbackV4, (ip) => { expect(classifyAddress(ip)).toBe('loopback'); }));
  fc.assert(fc.property(arbs.docV4, (ip) => { expect(classifyAddress(ip)).toBe('documentation'); }));
  fc.assert(fc.property(arbs.docV6, (g) => { expect(classifyAddress(ipv6CompressedWithZeroes(g))).toBe('documentation'); }));
  fc.assert(fc.property(arbs.multicastV4, (ip) => { expect(classifyAddress(ip)).toBe('multicast'); }));
  fc.assert(fc.property(arbs.multicastV6, (g) => { expect(classifyAddress(ipv6CompressedWithZeroes(g))).toBe('multicast'); }));
  fc.assert(fc.property(arbs.reservedV4, (ip) => { expect(classifyAddress(ip)).toBe('reserved'); }));
}

describe('parseAddress', () => {
  it('normalizes valid IPv4 addresses and rejects invalid ones', () => {
    expect(parseAddress('192.168.1.1')).toEqual({ family: 4, normalized: '192.168.1.1' });
    expect(parseAddress(' 8.8.8.8 ')).toEqual({ family: 4, normalized: '8.8.8.8' });
    expect(parseAddress('0.0.0.0')).toEqual({ family: 4, normalized: '0.0.0.0' });
    expect(parseAddress('256.0.0.1')).toBeNull();
    expect(parseAddress('01.2.3.4')).toBeNull();
    expect(parseAddress('192.168.1')).toBeNull();
    expect(parseAddress('')).toBeNull();
    expect(parseAddress('example.org')).toBeNull();
  });

  it('normalizes IPv6 compressed and expanded forms canonically', () => {
    expect(parseAddress('::1')).toEqual({ family: 6, normalized: '::1' });
    expect(parseAddress('0:0:0:0:0:0:0:1')).toEqual({ family: 6, normalized: '::1' });
    expect(parseAddress('2001:0db8:0000:0000:0000:0000:0000:0001')).toEqual({
      family: 6,
      normalized: '2001:db8::1',
    });
    expect(parseAddress('fe80::1%eth0')).toEqual({ family: 6, normalized: 'fe80::1' });
    expect(parseAddress('2001:db8::1::2')).toBeNull();
    expect(parseAddress('2001:db8:::1')).toBeNull();
  });
});

describe('classifyAddress & helpers', () => {
  it('classifies every §7.3 address range accurately', () => {
    const cases: [string, HopClass][] = [
      ['10.0.0.1', 'private'], ['172.16.0.1', 'private'], ['172.31.255.254', 'private'],
      ['192.168.1.1', 'private'], ['fc00::1', 'private'], ['fd12:3456:789a::1', 'private'],
      ['100.64.0.1', 'cgnat'], ['100.127.255.254', 'cgnat'],
      ['169.254.10.20', 'link-local'], ['fe80::1', 'link-local'], ['febf:ffff::1', 'link-local'],
      ['127.0.0.1', 'loopback'], ['127.255.255.254', 'loopback'], ['::1', 'loopback'],
      ['192.0.2.1', 'documentation'], ['198.51.100.9', 'documentation'],
      ['203.0.113.80', 'documentation'], ['2001:db8::1', 'documentation'],
      ['224.0.0.1', 'multicast'], ['239.255.255.255', 'multicast'], ['ff02::1', 'multicast'],
      ['240.0.0.1', 'reserved'], ['255.255.255.255', 'reserved'],
      ['8.8.8.8', 'public'], ['1.1.1.1', 'public'], ['172.32.0.1', 'public'],
      ['100.128.0.1', 'public'], ['2606:4700:4700::1111', 'public'],
    ];

    for (const [ip, expected] of cases) {
      expect(classifyAddress(ip)).toBe(expected);
      expect(isPublicAddress(ip)).toBe(expected === 'public');
      expect(isDocumentationAddress(ip)).toBe(expected === 'documentation');
    }
  });

  it('handles IPv4-mapped IPv6 addresses consistently', () => {
    expect(classifyAddress('::ffff:192.168.1.1')).toBe('private');
    expect(classifyAddress('::ffff:100.64.0.1')).toBe('cgnat');
    expect(classifyAddress('::ffff:8.8.8.8')).toBe('public');
  });

  it('checks CIDR membership for IPv4 and IPv6', () => {
    expect(inPrefix('198.51.100.42', '198.51.100.0/24')).toBe(true);
    expect(inPrefix('198.51.101.42', '198.51.100.0/24')).toBe(false);
    expect(inPrefix('2001:db8:abcd::1', '2001:db8::/32')).toBe(true);
    expect(inPrefix('2001:db9::1', '2001:db8::/32')).toBe(false);
    expect(inPrefix('192.168.1.1', 'fc00::/7')).toBe(false);
    expect(inPrefix('not-an-ip', '10.0.0.0/8')).toBe(false);
    expect(inPrefix('10.0.0.1', 'bad-cidr')).toBe(false);
  });
});

describe('address properties', () => {
  it('VOY-P-03 address classes match range specification', () => {
    assertIpv4AndIpv6Ranges();
  });

  it('VOY-P-04 no private address is marked public', () => {
    const arbs = rangeArbitraries();
    const nonPublicArb = fc.oneof(
      arbs.rfc1918,
      arbs.ula.map(ipv6CompressedWithZeroes),
      arbs.cgnat,
      arbs.linkLocalV4,
      arbs.linkLocalV6.map(ipv6CompressedWithZeroes),
      arbs.loopbackV4,
      fc.constant('::1'),
      arbs.docV4,
      arbs.docV6.map(ipv6CompressedWithZeroes),
      arbs.multicastV4,
      arbs.multicastV6.map(ipv6CompressedWithZeroes),
      arbs.reservedV4,
    );

    fc.assert(fc.property(nonPublicArb, (ip) => {
      expect(isPublicAddress(ip)).toBe(false);
    }));
  });
});

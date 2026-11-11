/**
 * Single source of truth for cache keys (VOY-F-12).
 * Adapters and the orchestrator must agree exactly, otherwise a warm cache
 * would be ignored offline and VOY-P-19 would break.
 */

export const CACHE_KEY_VERSION = 'v1';

export function ripeStatKey(ip: string): string {
  return `ripestat:${CACHE_KEY_VERSION}:${ip}`;
}

export function ipmapKey(ip: string): string {
  return `ipmap:${CACHE_KEY_VERSION}:${ip}`;
}

export function reverseDnsKey(ip: string): string {
  return `rdns:${CACHE_KEY_VERSION}:${ip}`;
}

export function ixpPrefixesKey(): string {
  return `ixpfx:${CACHE_KEY_VERSION}`;
}

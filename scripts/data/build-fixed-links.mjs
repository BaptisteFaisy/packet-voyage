#!/usr/bin/env node
/**
 * build-fixed-links.mjs — fibre-carrying fixed links (tunnels and bridges).
 *
 * Requirements (spec §7.9, §2):
 * Hand-made table of well-known fixed links that connect distinct landmasses
 * or major islands and carry optical fiber cables (Channel Tunnel, Øresund,
 * Seikan, Hong Kong–Zhuhai–Macao, Eurasia Tunnel, etc.).
 *
 * Offline & idempotent.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateProvenance } from './provenance.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const OUT_DIR = join(root, 'packages', 'data', 'datasets');
const OUT = join(OUT_DIR, 'fixed-links.json');

const FIXED_LINKS = [
  {
    id: 'channel-tunnel',
    name: 'Channel Tunnel (Folkestone – Coquelles)',
    a: { lat: 51.096, lon: 1.154 },
    b: { lat: 50.923, lon: 1.812 },
    countries: ['GB', 'FR'],
  },
  {
    id: 'oresund-bridge-tunnel',
    name: 'Øresund Bridge and Tunnel (Copenhagen – Malmö)',
    a: { lat: 55.629, lon: 12.651 },
    b: { lat: 55.578, lon: 12.949 },
    countries: ['DK', 'SE'],
  },
  {
    id: 'great-belt-fixed-link',
    name: 'Great Belt Fixed Link (Storebælt)',
    a: { lat: 55.334, lon: 11.025 },
    b: { lat: 55.314, lon: 10.852 },
    countries: ['DK'],
  },
  {
    id: 'seikan-tunnel',
    name: 'Seikan Tunnel (Honshu – Hokkaido)',
    a: { lat: 41.196, lon: 140.354 },
    b: { lat: 41.528, lon: 140.231 },
    countries: ['JP'],
  },
  {
    id: 'hong-kong-zhuhai-macao',
    name: 'Hong Kong–Zhuhai–Macao Bridge and Tunnel',
    a: { lat: 22.316, lon: 113.937 },
    b: { lat: 22.208, lon: 113.578 },
    countries: ['HK', 'CN', 'MO'],
  },
  {
    id: 'marmaray-eurasia-tunnel',
    name: 'Eurasia Tunnel and Marmaray (Bosphorus crossing, Istanbul)',
    a: { lat: 41.002, lon: 28.986 },
    b: { lat: 40.999, lon: 29.027 },
    countries: ['TR'],
  },
  {
    id: 'tokyo-bay-aqua-line',
    name: 'Tokyo Bay Aqua-Line',
    a: { lat: 35.531, lon: 139.794 },
    b: { lat: 35.452, lon: 139.973 },
    countries: ['JP'],
  },
  {
    id: 'confederation-bridge',
    name: 'Confederation Bridge (New Brunswick – Prince Edward Island)',
    a: { lat: 46.129, lon: -63.785 },
    b: { lat: 46.241, lon: -63.716 },
    countries: ['CA'],
  },
  {
    id: 'bering-none',
    name: 'Bering Strait (no fixed link — conceptual benchmark)',
    a: { lat: 65.61, lon: -168.08 },
    b: { lat: 66.02, lon: -169.81 },
    countries: ['US', 'RU'],
  },
];

function main() {
  const sorted = [...FIXED_LINKS].sort((a, b) => a.id.localeCompare(b.id));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`wrote ${OUT}: ${sorted.length} fixed links`);
  updateProvenance('fixed-links', { features: sorted.length });
}

main();

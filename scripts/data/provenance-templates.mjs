#!/usr/bin/env node
/**
 * provenance-templates.mjs — the hand-written part of every provenance sheet.
 *
 * `features` and `sha256` are measured by `provenance.mjs` at build time and
 * never written here. Keep one entry per dataset id; the shape is exactly the
 * §6.3 sheet (validated against `ProvenanceSchema` from @packet-voyage/schema).
 */
export const TEMPLATES = {
  'submarine-cables': {
    id: 'submarine-cables',
    title: 'Submarine telecommunication cables',
    origin: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
    licence: 'ODbL-1.0',
    retrieved_at: '2026-11-11',
    query: 'scripts/data/cables.overpassql',
    transform: 'scripts/data/build-cables.mjs',
    attribution: '© OpenStreetMap contributors',
  },
  landmasses: {
    id: 'landmasses',
    title: 'World landmasses (110 m resolution)',
    origin: 'Natural Earth (nvkelso/natural-earth-vector mirror)',
    url: 'https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/',
    licence: 'Public-Domain',
    retrieved_at: '2026-11-11',
    query: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson',
    transform: 'scripts/data/build-landmass.mjs',
    attribution: 'Made with Natural Earth',
  },
  'fixed-links': {
    id: 'fixed-links',
    title: 'Fibre-carrying fixed links (tunnels and bridges)',
    origin: 'Packet Voyage contributors — hand-curated table of well-known links',
    url: 'https://github.com/BaptisteFaisy/packet-voyage/blob/main/docs/fr/CAHIER-DES-CHARGES.md',
    licence: 'CC0-1.0',
    retrieved_at: '2026-11-11',
    transform: 'scripts/data/build-fixed-links.mjs',
    attribution: 'Fixed links: hand-curated by Packet Voyage contributors (CC0); facts not copyrightable, coordinates approximate',
  },
  hints: {
    id: 'hints',
    title: 'Airport codes and network-relevant cities',
    origin: 'Packet Voyage contributors — hand-curated table',
    url: 'https://github.com/BaptisteFaisy/packet-voyage/blob/main/docs/fr/CAHIER-DES-CHARGES.md',
    licence: 'CC0-1.0',
    retrieved_at: '2026-11-11',
    transform: 'scripts/data/build-hints.mjs',
    attribution: 'Hints table: hand-curated by Packet Voyage contributors (CC0); facts not copyrightable, coordinates rounded to 0.01°',
  },
};

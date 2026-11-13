export interface ColorPattern {
  color: string;
  dashArray: string;
  name: string;
}

const NETWORK_PALETTE: ColorPattern[] = [
  { color: '#38bdf8', dashArray: 'none', name: 'Solid cyan' },
  { color: '#f472b6', dashArray: '6 3', name: 'Dashed pink' },
  { color: '#facc15', dashArray: '2 2', name: 'Dotted amber' },
  { color: '#4ade80', dashArray: '8 4 2 4', name: 'Dash-dot emerald' },
  { color: '#a78bfa', dashArray: '12 3', name: 'Long-dash violet' },
  { color: '#fb923c', dashArray: '4 4', name: 'Short-dash orange' },
  { color: '#2dd4bf', dashArray: '10 3 3 3', name: 'Pattern teal' },
  { color: '#e879f9', dashArray: '5 5', name: 'Medium-dash fuchsia' },
];

export function getNetworkStyle(networkNameOrAsn: string | null | undefined): ColorPattern {
  if (!networkNameOrAsn) {
    return { color: '#94a3b8', dashArray: '4 2', name: 'Unknown network' };
  }
  let hash = 0;
  for (let i = 0; i < networkNameOrAsn.length; i += 1) {
    hash = (hash * 31 + networkNameOrAsn.charCodeAt(i)) >>> 0;
  }
  const idx = hash % NETWORK_PALETTE.length;
  const picked = NETWORK_PALETTE[idx];
  return picked ?? { color: '#38bdf8', dashArray: 'none', name: 'Default' };
}

export function getCertaintyDash(certainty: 'measured' | 'inferred' | 'assumed'): string {
  switch (certainty) {
    case 'measured':
      return 'none';
    case 'inferred':
      return '6 4';
    case 'assumed':
      return '2 3';
    default:
      return 'none';
  }
}

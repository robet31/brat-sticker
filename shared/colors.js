// ---------------------------------------------------------------------------
// shared/colors.js — palet warna BRAT
// ---------------------------------------------------------------------------

export const COLORS = {
  brat:   { bg: '#A8E10C', fg: '#0B0B0B', name: 'brat' },
  lime:   { bg: '#C6FF00', fg: '#0B0B0B', name: 'lime' },
  bubble: { bg: '#FFB3D9', fg: '#1A1A1B', name: 'bubble' },
  sky:    { bg: '#8AD8FF', fg: '#0B2233', name: 'sky' },
  grape:  { bg: '#B78CFF', fg: '#1B0B33', name: 'grape' },
  sun:    { bg: '#FFE45C', fg: '#2B2200', name: 'sun' },
  mint:   { bg: '#7CFFC4', fg: '#04261A', name: 'mint' },
  mono:   { bg: '#EDEDED', fg: '#111111', name: 'mono' },
  ink:    { bg: '#111111', fg: '#F5F5F5', name: 'ink' },
  sunset: { bg: '#FF7A45', fg: '#2B0B00', name: 'sunset' },
  aqua:   { bg: '#5EEAD4', fg: '#04302A', name: 'aqua' },
  hotpink:{ bg: '#FF6BD6', fg: '#2B0033', name: 'hotpink' },
  blood:  { bg: '#B3121A', fg: '#FFE9E9', name: 'blood' },
};

/** Resolve nama warna atau hex (#RRGGBB) -> {bg, fg} | null */
export function resolveColor(input) {
  if (!input) return COLORS.brat;
  const key = String(input).trim().toLowerCase();
  if (COLORS[key]) return COLORS[key];

  const hex = key.startsWith('#') ? key : '#' + key;
  if (/^#[0-9a-f]{6}$/.test(hex)) return { bg: hex, fg: pickFg(hex), name: hex };

  return null;
}

/** Hitung warna teks kontras (hitam/putih) dari hex background */
function pickFg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0B0B0B' : '#F5F5F5';
}

export const COLOR_NAMES = Object.keys(COLORS);

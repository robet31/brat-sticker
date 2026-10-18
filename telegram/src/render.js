// BRAT sticker renderer — satori (SVG) + resvg-wasm (PNG)
import satori from 'satori';
import { Resvg } from '@resvg/resvg-wasm';

const FONT_FAMILY = 'Archivo Black';
const FONT_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/archivo-black@5.2.5/files/archivo-black-latin-400-normal.woff';

let fontCache = null;

export async function init() {
  if (!fontCache) {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error('gagal ambil font: ' + res.status);
    fontCache = await res.arrayBuffer();
  }
  return { fonts: fontCache, ResvgCtor: Resvg };
}

export const COLORS = {
  brat:   { bg: '#A8E10C', fg: '#0B0B0B' }, // hijau neon khas BRAT
  lime:   { bg: '#C6FF00', fg: '#0B0B0B' },
  bubble: { bg: '#FFB3D9', fg: '#1A1A1B' },
  sky:    { bg: '#8AD8FF', fg: '#0B2233' },
  grape:  { bg: '#B78CFF', fg: '#1B0B33' },
  sun:    { bg: '#FFE45C', fg: '#2B2200' },
  mint:   { bg: '#7CFFC4', fg: '#04261A' },
  mono:   { bg: '#EDEDED', fg: '#111111' },
  ink:    { bg: '#111111', fg: '#F5F5F5' },
  sunset: { bg: '#FF7A45', fg: '#2B0B00' },
  aqua:   { bg: '#5EEAD4', fg: '#04302A' },
};

// warna dengan hex: #ff7a45 / FF7A45
export function resolveColor(input) {
  if (!input) return COLORS.brat;
  const key = String(input).trim().toLowerCase();
  if (COLORS[key]) return COLORS[key];
  const hex = key.startsWith('#') ? key : '#' + key;
  if (/^#[0-9a-f]{6}$/.test(hex)) {
    return { bg: hex, fg: pickFg(hex) };
  }
  return null;
}

function pickFg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0B0B0B' : '#F5F5F5';
}

/**
 * @param {object} o
 * @param {string} [o.text]      teks untuk stiker
 * @param {string} [o.photoDataUri] foto (data:image/...)
 * @param {string} [o.photoMime]
 * @param {object} o.color       {bg, fg}
 * @param {number} [o.size]      ukuran 512 (default)
 */
export async function renderSticker(o) {
  const { ResvgCtor, fonts } = await init();
  const SIZE = o.size || 512;
  const color = o.color || COLORS.brat;
  const photo = o.photoDataUri ? { src: o.photoDataUri } : null;

  const el = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.bg,
        padding: photo ? '28px 28px 32px' : '36px',
        gap: photo ? '18px' : '0px',
      },
      children: [
        ...(photo
          ? [{
              type: 'img',
              props: {
                src: photo.src,
                width: SIZE - 56,
                height: SIZE - 56,
                style: {
                  width: SIZE - 56 + 'px',
                  height: SIZE - 56 + 'px',
                  objectFit: 'cover',
                  borderRadius: '18px',
                },
              },
            }]
          : []),
        ...(o.text
          ? [{
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  fontFamily: FONT_FAMILY,
                  fontWeight: 400,
                  fontSize: autoFontSize(o.text, SIZE, photo) + 'px',
                  color: color.fg,
                  textAlign: 'center',
                  lineHeight: 1.02,
                  letterSpacing: '-0.02em',
                  textTransform: 'lowercase',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                },
                children: o.text,
              },
            }]
          : []),
      ],
    },
  };

  const svg = await satori(el, {
    width: SIZE,
    height: SIZE,
    fonts: [
      { name: FONT_FAMILY, data: fonts, weight: 400, style: 'normal' },
    ],
  });

  const resvg = new ResvgCtor(svg, {
    fitTo: { mode: 'width', value: SIZE },
    font: {
      fontBuffers: [fonts],
      loadSystemFonts: false,
      defaultFontFamily: FONT_FAMILY,
    },
  });

  return resvg.render().asPng();
}

// font mengecil otomatis biar teks panjang tetep muat
function autoFontSize(text, size, photo) {
  const len = String(text).length;
  const budget = photo ? size * 0.5 : size * 0.78; // tinggi area teks
  let fs = size * 0.3;
  // perkiraan: chars per baris ~ (size*0.86) / (fs*0.58), baris = ceil(len/cpl)
  const width = photo ? size - 56 : size - 72;
  const lines = Math.max(1, Math.ceil(len / Math.max(1, width / (fs * 0.58))));
  while (lines * fs * 1.02 > budget && fs > 14) {
    fs -= 2;
    const l2 = Math.max(1, Math.ceil(len / Math.max(1, width / (fs * 0.58))));
    if (l2 * fs * 1.02 <= budget) break;
  }
  return Math.max(14, Math.min(fs, size * 0.34));
}

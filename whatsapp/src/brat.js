// ---------------------------------------------------------------------------
// whatsapp/src/brat.js — generator stiker BRAT (satori + resvg)
// Sama persis dengan versi Cloudflare Worker, tapi jalan di Node.
// ---------------------------------------------------------------------------
import satori from 'satori';
import { Resvg } from '@resvg/resvg-wasm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_FAMILY = 'Archivo Black';
const FONT_PATH = join(__dirname, '..', 'shared', 'fonts', 'archivo-black.woff');

export const COLORS = {
  brat:    { bg: '#A8E10C', fg: '#0B0B0B' },
  lime:    { bg: '#C6FF00', fg: '#0B0B0B' },
  bubble:  { bg: '#FFB3D9', fg: '#1A1A1B' },
  sky:     { bg: '#8AD8FF', fg: '#0B2233' },
  grape:   { bg: '#B78CFF', fg: '#1B0B33' },
  sun:     { bg: '#FFE45C', fg: '#2B2200' },
  mint:    { bg: '#7CFFC4', fg: '#04261A' },
  mono:    { bg: '#EDEDED', fg: '#111111' },
  ink:     { bg: '#111111', fg: '#F5F5F5' },
  sunset:  { bg: '#FF7A45', fg: '#2B0B00' },
  aqua:    { bg: '#5EEAD4', fg: '#04302A' },
  hotpink: { bg: '#FF6BD6', fg: '#2B0033' },
  blood:   { bg: '#B3121A', fg: '#FFE9E9' },
};

let fontBuf = null;
async function font() {
  if (!fontBuf) fontBuf = await readFile(FONT_PATH);
  return fontBuf;
}

export function resolveColor(input) {
  if (!input) return COLORS.brat;
  const key = String(input).trim().toLowerCase();
  if (COLORS[key]) return COLORS[key];
  const hex = key.startsWith('#') ? key : '#' + key;
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return { bg: hex, fg: lum > 0.6 ? '#0B0B0B' : '#F5F5F5' };
  }
  return null;
}

export async function renderSticker({ text, photoDataUri, color = COLORS.brat, size = 512 }) {
  const fonts = await font();

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
        padding: photoDataUri ? '28px 28px 32px' : '36px',
        gap: photoDataUri ? '18px' : '0px',
      },
      children: [
        ...(photoDataUri
          ? [{
              type: 'img',
              props: {
                src: photoDataUri,
                width: size - 56,
                height: size - 56,
                style: {
                  width: size - 56 + 'px',
                  height: size - 56 + 'px',
                  objectFit: 'cover',
                  borderRadius: '18px',
                },
              },
            }]
          : []),
        ...(text
          ? [{
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  fontFamily: FONT_FAMILY,
                  fontSize: autoFontSize(text, size, !!photoDataUri) + 'px',
                  color: color.fg,
                  textAlign: 'center',
                  lineHeight: 1.02,
                  letterSpacing: '-0.02em',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                },
                children: String(text).toLowerCase().slice(0, 300),
              },
            }]
          : []),
      ],
    },
  };

  const svg = await satori(el, {
    width: size,
    height: size,
    fonts: [{ name: FONT_FAMILY, data: fonts, weight: 400, style: 'normal' }],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: {
      fontBuffers: [fonts],
      loadSystemFonts: false,
      defaultFontFamily: FONT_FAMILY,
    },
  });

  return Buffer.from(resvg.render().asPng());
}

function autoFontSize(text, size, hasPhoto) {
  const budget = hasPhoto ? size * 0.5 : size * 0.78;
  const width = hasPhoto ? size - 56 : size - 72;
  let fs = size * 0.3;
  const fits = (n) => {
    const lines = Math.max(1, Math.ceil(text.length / Math.max(1, width / (n * 0.58))));
    return lines * n * 1.02 <= budget;
  };
  while (!fits(fs) && fs > 14) fs -= 2;
  return Math.max(14, Math.min(fs, size * 0.34));
}

// ---------------------------------------------------------------------------
// Stiker.gs — generator stiker BRAT 100% pure Apps Script
//
// Tidak pakai library luar, tidak pakai service eksternal.
// Cara kerja: font bitmap 5x7 -> dilayout -> digambar ke palet -> di-encode
// jadi PNG (color type 3 / indexed) memakai deflate "stored block".
// ---------------------------------------------------------------------------

const STIKER_SIZE = 512;

/* ------------------------------- FONT BITMAP ------------------------------ */
// 5x7, lowercase (gaya BRAT), 7 baris x 5 kolom per glyph.
// '#' = piksel menyala, '.' = transparan.
const FONT = {
  a: '.###.' + '#...#' + '#...#' + '#...#' + '#...#' + '#...#' + '.###.',
  b: '####.' + '#...#' + '#...#' + '####.' + '#...#' + '#...#' + '####.',
  c: '.###.' + '#...#' + '#....' + '#....' + '#....' + '#...#' + '.###.',
  d: '....#' + '....#' + '#...#' + '#.#.#' + '##..#' + '#...#' + '..##.',
  e: '.###.' + '#...#' + '#...#' + '#####' + '#....' + '#....' + '.###.',
  f: '..##.' + '.#...' + '.#...' + '####.' + '.#...' + '.#...' + '.#...',
  g: '.####' + '#....' + '#....' + '#.###' + '#...#' + '#...#' + '.###.',
  h: '#....' + '#....' + '#....' + '##..#' + '#.#.#' + '#..##' + '#...#',
  i: '..#..' + '.....' + '.##..' + '..#..' + '..#..' + '..#..' + '.###.',
  j: '...#.' + '.....' + '..##.' + '...#.' + '...#.' + '#..#.' + '.##..',
  k: '#....' + '#....' + '#..#.' + '#.#..' + '##...' + '#.#..' + '#..##',
  l: '.##..' + '..#..' + '..#..' + '..#..' + '..#..' + '..#..' + '.###.',
  m: '##.#.' + '#.#.#' + '#.#.#' + '#.#.#' + '#.#.#' + '#.#.#' + '#.#.#',
  n: '#....' + '#....' + '##...' + '#.#.#' + '#..#.' + '#...#' + '#...#',
  o: '.###.' + '#...#' + '#...#' + '#...#' + '#...#' + '#...#' + '.###.',
  p: '##...' + '#..#.' + '#...#' + '##..#' + '#....' + '#....' + '#....',
  q: '.###.' + '#...#' + '#...#' + '#...#' + '#.#.#' + '#..#.' + '.##.#',
  r: '#....' + '#....' + '#..#.' + '##.#.' + '#.#..' + '#.#..' + '#.#..',
  s: '.####' + '#....' + '#....' + '.###.' + '....#' + '....#' + '####.',
  t: '.#...' + '.#...' + '####.' + '.#...' + '.#...' + '.#..#' + '..##.',
  u: '#...#' + '#...#' + '#...#' + '#...#' + '#...#' + '#...#' + '.###.',
  v: '#...#' + '#...#' + '#...#' + '#...#' + '#...#' + '.#.#.' + '..#..',
  w: '#...#' + '#...#' + '#.#.#' + '#.#.#' + '#.#.#' + '#.#.#' + '.#.#.',
  x: '#...#' + '#...#' + '.#.#.' + '..#..' + '.#.#.' + '#...#' + '#...#',
  y: '#...#' + '#...#' + '.#.#.' + '..#..' + '..#..' + '..#..' + '..#..',
  z: '#####' + '....#' + '...#.' + '..#..' + '.#...' + '#....' + '#####',
  0: '.###.' + '#..##' + '#.#.#' + '#.#.#' + '##..#' + '#...#' + '.###.',
  1: '..#..' + '.##..' + '..#..' + '..#..' + '..#..' + '..#..' + '.###.',
  2: '.###.' + '#...#' + '....#' + '...#.' + '..#..' + '.#...' + '#####',
  3: '#####' + '...#.' + '..#..' + '...#.' + '....#' + '#...#' + '.###.',
  4: '...#.' + '..##.' + '.#.#.' + '#..#.' + '#####' + '...#.' + '...#.',
  5: '#####' + '#....' + '####.' + '....#' + '....#' + '#...#' + '.###.',
  6: '..##.' + '.#...' + '#....' + '####.' + '#...#' + '#...#' + '.###.',
  7: '#####' + '....#' + '...#.' + '..#..' + '.#...' + '.#...' + '.#...',
  8: '.###.' + '#...#' + '#...#' + '.###.' + '#...#' + '#...#' + '.###.',
  9: '.###.' + '#...#' + '#...#' + '.####' + '....#' + '...#.' + '.##..',
  ' ': '.....' + '.....' + '.....' + '.....' + '.....' + '.....' + '.....',
  '.': '.....' + '.....' + '.....' + '.....' + '.....' + '..#..' + '.....',
  ',': '.....' + '.....' + '.....' + '.....' + '..#..' + '..#..' + '.#...',
  '!': '..#..' + '..#..' + '..#..' + '..#..' + '..#..' + '.....' + '..#..',
  '?': '.###.' + '#...#' + '....#' + '...#.' + '..#..' + '.....' + '..#..',
  "'": '..#..' + '..#..' + '.....' + '.....' + '.....' + '.....' + '.....',
  '-': '.....' + '.....' + '.....' + '#####' + '.....' + '.....' + '.....',
  '_': '.....' + '.....' + '.....' + '.....' + '.....' + '.....' + '#####',
  ':': '.....' + '..#..' + '.....' + '.....' + '.....' + '..#..' + '.....',
  '+': '.....' + '..#..' + '..#..' + '#####' + '..#..' + '..#..' + '.....',
  '/': '....#' + '....#' + '...#.' + '..#..' + '.#...' + '#....' + '#....',
  '&': '.##..' + '#..#.' + '#.#..' + '.#...' + '#.#.#' + '#..#.' + '.##.#',
  '@': '.###.' + '#...#' + '#.###' + '#.#.#' + '#.###' + '#....' + '.###.',
  '(': '...#.' + '..#..' + '.#...' + '.#...' + '.#...' + '..#..' + '...#.',
  ')': '.#...' + '..#..' + '...#.' + '...#.' + '...#.' + '..#..' + '.#...',
  '#': '.#.#.' + '.#.#.' + '#####' + '.#.#.' + '#####' + '.#.#.' + '.#.#.',
  '*': '.....' + '#.#.#' + '.###.' + '#####' + '.###.' + '#.#.#' + '.....',
  '>': '.#...' + '..#..' + '...#.' + '....#' + '...#.' + '..#..' + '.#...',
  '<': '...#.' + '..#..' + '.#...' + '#....' + '.#...' + '..#..' + '...#.',
};

const GLYPH_W = 5;
const GLYPH_H = 7;

/* --------------------------- LAYOUT & GAMBAR ------------------------------ */

function glyphFor(ch) {
  return FONT[ch] || FONT[ch.toLowerCase()] || FONT[' '];
}

/** lebar spasi, mengikuti skala font */
function sp(scale) {
  return Math.max(1, Math.round(GLYPH_W * scale * 0.6));
}

/**
 * Pecah teks jadi baris yang muat dalam maxWidth (piksel).
 * @return {string[]} array of chars per line
 */
function layoutText(text, scale, maxWidth) {
  const charW = GLYPH_W * scale;
  const spaceW = Math.max(1, Math.round(charW * 0.6));
  const advance = charW + scale; // lebar per huruf + spasi antar huruf
  const words = String(text).toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [['']];

  // pecah kata yang lebih panjang dari maxWidth jadi potongan karakter
  const chunks = [];
  for (const word of words) {
    const maxChars = Math.max(1, Math.floor(maxWidth / advance));
    if (word.length <= maxChars) {
      chunks.push({ chars: word, space: true });
    } else {
      for (let i = 0; i < word.length; i += maxChars) {
        chunks.push({ chars: word.substr(i, maxChars), space: i > 0 });
      }
    }
  }

  const lines = [];
  let cur = [];
  let w = 0;

  for (const chunk of chunks) {
    const chars = Array.from(chunk.chars);
    const cw = chars.length * advance - scale;

    if (w + (cur.length ? spaceW : 0) + cw > maxWidth && cur.length) {
      lines.push(cur);
      cur = chars;
      w = cw;
    } else {
      if (cur.length) { cur.push(' '); w += spaceW; }
      for (const c of chars) { cur.push(c); w += advance; }
      w -= scale;
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/**
 * Render stiker BRAT -> byte array PNG.
 * @param {string} text
 * @param {object} opts
 * @param {string} [opts.bg='#A8E10C'] warna background (hex)
 * @param {string} [opts.fg='#0B0B0B'] warna teks
 * @param {boolean} [opts.transparent=false] true => bg transparan (untuk stiker WA)
 * @param {number} [opts.size=512]
 * @param {number} [opts.scale] skala font (auto jika kosong)
 * @param {number} [opts.lineHeight=1.15]
 * @return {number[]} byte array PNG
 */
function renderSticker(text, opts) {
  opts = opts || {};
  const SIZE = opts.size || STIKER_SIZE;
  const text2 = String(text || 'brat').slice(0, 300);

  // palet: 0 = transparan, 1 = bg, 2 = fg, 3 = outline/shadow
  const bg = hexToRgb(opts.bg || '#A8E10C');
  const fg = hexToRgb(opts.fg || '#0B0B0B');
  const shadow = [
    Math.round(fg[0] * 0.18), Math.round(fg[1] * 0.18), Math.round(fg[2] * 0.18),
  ];
  const transparent = !!opts.transparent;
  const margin = Math.round(SIZE * 0.09);
  const maxW = SIZE - margin * 2;
  const lineHeight = opts.lineHeight || 1.15;

  const availW = SIZE - margin * 2;
  const availH = SIZE - margin * 2;

  // pilih skala terbesar yang muat (harus muat lebar DAN tinggi)
  let scale = Math.min(opts.scale || Math.floor(SIZE * 0.13), Math.floor(SIZE / GLYPH_H));
  let lines = [['']];

  while (scale >= 2) {
    const trial = layoutText(text2, scale, availW);
    const step = Math.round(GLYPH_H * scale * lineHeight);
    const totalH = trial.length * step;
    const widest = trial.reduce((m, l) => Math.max(m, measureLine(l, scale, sp(scale))), 0);
    if (totalH <= availH && widest <= availW) { lines = trial; break; }
    scale--;
  }
  if (!lines.length) lines = [['']];
  scale = Math.max(2, scale);

  const charW = GLYPH_W * scale;
  const spaceW = sp(scale);
  const lineStep = Math.round(GLYPH_H * scale * lineHeight);
  const blockH = lines.length * lineStep;
  const top = Math.round((SIZE - blockH) / 2);

  // canvas palet (index per piksel)
  // index: 0 = transparan, 1 = bg, 2 = fg, 3 = outline/shadow
  const px = new Uint8Array(SIZE * SIZE);
  if (!transparent) fillRect(px, SIZE, 0, 0, SIZE, SIZE, 1);

  // outline hitam tipis di belakang teks biar kontras
  const OUT = Math.max(1, Math.round(scale / 3));
  for (let pass = 0; pass < 2; pass++) {
    const val = pass === 0 ? 3 : 2; // shadow dulu, teks di atas
    const dx = pass === 0 ? -OUT : 0;
    const dy = pass === 0 ? -OUT : 0;

    lines.forEach((line, li) => {
      const lw = measureLine(line, scale, spaceW);
      let x = Math.round((SIZE - lw) / 2) + dx;
      const y = top + li * lineStep + dy;

      for (const ch of line) {
        const g = glyphFor(ch);
        const gw = (ch === ' ') ? 0 : GLYPH_W * scale;
        if (gw) drawGlyph(px, SIZE, x, y, g, scale, val);
        x += (ch === ' ' ? spaceW : charW) + scale;
      }
    });
  }

  // palet harus urut sesuai indeks: 0 transparan, 1 bg, 2 fg, 3 shadow
  return encodePNG(px, SIZE, SIZE, [bg, bg, fg, shadow], transparent);
}

function measureLine(line, scale, spaceW) {
  let w = 0;
  for (const ch of line) w += (ch === ' ' ? spaceW : GLYPH_W * scale) + scale;
  return Math.max(0, w - scale);
}

function drawGlyph(px, W, ox, oy, glyph, scale, val) {
  for (let r = 0; r < GLYPH_H; r++) {
    for (let c = 0; c < GLYPH_W; c++) {
      if (glyph.charAt(r * GLYPH_W + c) !== '#') continue;
      const bx = ox + c * scale;
      const by = oy + r * scale;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = bx + dx, y = by + dy;
          if (x >= 0 && x < W && y >= 0 && y < W) px[y * W + x] = val;
        }
      }
    }
  }
}

function fillRect(px, W, x0, y0, w, h, val) {
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= W) continue;
    const row = y * W;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= W) continue;
      px[row + x] = val;
    }
  }
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(f.slice(0, 2), 16) || 0,
    parseInt(f.slice(2, 4), 16) || 0,
    parseInt(f.slice(4, 6), 16) || 0,
  ];
}

/* ----------------------------- PNG ENCODER -------------------------------- */

const CRC_TABLE = (function () {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function adler32(bytes) {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** bungkus data jadi "stored block" deflate (tanpa kompresi, tetap valid) */
function deflateStored(data) {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(data.length / MAX));
  const out = [0x78, 0x01]; // header zlib
  for (let b = 0; b < blocks; b++) {
    const start = b * MAX;
    const len = Math.min(MAX, data.length - start);
    const final = b === blocks - 1 ? 1 : 0;
    out.push(final); // BFINAL + BTYPE=00
    out.push(len & 0xff, (len >>> 8) & 0xff);
    const nlen = ~len & 0xffff;
    out.push(nlen & 0xff, (nlen >>> 8) & 0xff);
    for (let i = 0; i < len; i++) out.push(data[start + i]);
  }
  const ad = adler32(data);
  out.push((ad >>> 24) & 0xff, (ad >>> 16) & 0xff, (ad >>> 8) & 0xff, ad & 0xff);
  return out;
}

function u32(n) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function chunk(type, data) {
  const out = u32(data.length);
  const typeBytes = type.split('').map((c) => c.charCodeAt(0));
  const all = typeBytes.concat(data);
  return out.concat(all, u32(crc32(all)));
}

/**
 * PNG color type 3 (palette) + tRNS supaya bisa transparan.
 * @param {Uint8Array} px  indeks palet per piksel
 * @param {Array<number[]>} palette
 * @param {boolean} transparent
 */
function encodePNG(px, W, H, palette, transparent) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  // IHDR: width, height, bitdepth=8, colortype=3, deflate, adaptive, no interlace
  const ihdr = u32(W).concat(u32(H), [8, 3, 0, 0, 0]);

  // PLTE
  const plte = [];
  palette.forEach((c) => plte.push(c[0], c[1], c[2]));

  // tRNS: index 0 transparan kalau mode transparent
  const trns = transparent ? [0, 255] : null;

  // IDAT: scanline (filter byte 0 + indeks piksel)
  const raw = [];
  for (let y = 0; y < H; y++) {
    raw.push(0);
    const row = y * W;
    for (let x = 0; x < W; x++) raw.push(px[row + x]);
  }

  const parts = [sig, chunk('IHDR', ihdr), chunk('PLTE', plte)];
  if (trns) parts.push(chunk('tRNS', trns));
  parts.push(chunk('IDAT', deflateStored(raw)));
  parts.push(chunk('IEND', []));

  return [].concat.apply([], parts);
}

/** PNG -> blob (untuk dikirim ke Telegram) */
function stickerBlob(text, opts) {
  const bytes = renderSticker(text, opts);
  return Utilities.newBlob(bytes, 'image/png', 'brat.png');
}

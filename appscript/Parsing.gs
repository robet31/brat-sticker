// ---------------------------------------------------------------------------
// Parsing.gs — parser command + teks bantuan (dipakai Code.gs)
// ---------------------------------------------------------------------------

const HELP_TEXT =
  '👋 *BRAT Sticker Bot*\n\n' +
  'Kirim teks atau foto, aku jadiin stiker BRAT 512×512.\n\n' +
  '*Command*\n' +
  '`/stiker <teks>` — stiker teks BRAT\n' +
  '`/warna <nama|hex> <teks>` — stiker berwarna\n' +
  '`/daftar` — daftar command\n' +
  '`/warna` — daftar warna\n' +
  '`/ping` — cek bot hidup\n' +
  '`/start` — bantuan\n\n' +
  '📷 *Kirim foto* langsung → jadi stiker 512×512\n' +
  '💬 *Kirim teks* tanpa command → jadi stiker';

const DAFTAR_TEXT =
  '📋 *Daftar command*\n\n' +
  '`/stiker <teks>` — stiker teks\n' +
  '`/s <teks>` — alias stiker\n' +
  '`/ganti <teks>` — alias stiker\n' +
  '`/warna <nama|hex> <teks>` — stiker berwarna\n' +
  '`/daftar` — daftar ini\n' +
  '`/ping` — health check\n' +
  '`/start` — bantuan\n\n' +
  '📷 Foto langsung → stiker\n' +
  '💬 Teks biasa → stiker';

const COLOR_NAMES_MAP = {
  brat: 1, lime: 1, bubble: 1, sky: 1, grape: 1, sun: 1, mint: 1,
  mono: 1, ink: 1, sunset: 1, aqua: 1, hotpink: 1, blood: 1,
};

function colorListText() {
  return (
    '🎨 *Format:* `/warna <nama|hex> teks kamu`\n\n' +
    '*Nama warna:*\n' +
    '`brat` `lime` `bubble` `sky` `grape` `sun` `mint`\n' +
    '`mono` `ink` `sunset` `aqua` `hotpink` `blood`\n\n' +
    '*Atau hex bebas:*\n' +
    '`/warna #ff7a45 halo`'
  );
}

/**
 * Parse pesan jadi intent.
 * @return {{action:string, text?:string, color?:string, message?:string}}
 */
function parseIntent(rawText, opts) {
  opts = opts || {};
  var hasPhoto = !!opts.hasPhoto;
  var replyHasPhoto = !!opts.replyPhoto;
  var text = String(rawText || '').trim();

  // bukan command
  if (text.charAt(0) !== '/') {
    if (hasPhoto) return { action: 'sticker', text: text || 'brat', color: 'brat' };
    if (text) return { action: 'stiker', text: text, color: 'brat' };
    return { action: 'ignore' };
  }

  var parts = text.split(/\s+/);
  var cmd = parts[0].split('@')[0].toLowerCase();
  var arg = parts.slice(1).join(' ').trim();

  if (cmd === '/start' || cmd === '/help') return { action: 'help' };
  if (cmd === '/daftar' || cmd === '/commands') return { action: 'daftar' };
  if (cmd === '/ping') return { action: 'ping' };

  if (cmd === '/warna') {
    if (!arg) return { action: 'warnahelp' };
    var seg = arg.split(/\s+/);
    var isi = seg.slice(1).join(' ').trim();
    if (!isi) return { action: 'warnahelp' };
    return { action: 'sticker', text: isi, color: seg[0] };
  }

  if (cmd === '/stiker' || cmd === '/s' || cmd === '/ganti') {
    var color = 'brat';
    var isi2 = arg;
    if (arg) {
      var seg2 = arg.split(/\s+/);
      if (looksLikeColor(seg2[0])) {
        color = seg2[0];
        isi2 = seg2.slice(1).join(' ').trim();
      }
    }
    if (!isi2 && !replyHasPhoto) {
      return { action: 'error', message: '⚠️ Cara pakai: `/stiker teks kamu`' };
    }
    return { action: 'sticker', text: isi2 || 'brat', color: color };
  }

  return {
    action: 'error',
    message: '❓ Command `' + cmd + '` gak ada.\n\n' + HELP_TEXT,
  };
}

function looksLikeColor(token) {
  if (!token) return false;
  var t = String(token).toLowerCase();
  if (COLOR_NAMES_MAP[t]) return true;
  return /^#?[0-9a-f]{6}$/i.test(token);
}

/** Resolve nama/hex -> {bg, fg} */
function resolveColor(input) {
  var PALETTE = {
    brat:   { bg: '#A8E10C', fg: '#0B0B0B' },
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
    hotpink:{ bg: '#FF6BD6', fg: '#2B0033' },
    blood:  { bg: '#B3121A', fg: '#FFE9E9' },
  };
  if (!input) return PALETTE.brat;
  var key = String(input).trim().toLowerCase();
  if (PALETTE[key]) return PALETTE[key];

  var hex = key.charAt(0) === '#' ? key : '#' + key;
  if (/^#[0-9a-f]{6}$/.test(hex)) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return { bg: hex, fg: lum > 0.6 ? '#0B0B0B' : '#F5F5F5' };
  }
  return PALETTE.brat;
}

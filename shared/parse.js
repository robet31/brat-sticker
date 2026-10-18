// ---------------------------------------------------------------------------
// shared/parse.js — parser command (dipakai Telegram & WhatsApp)
// ---------------------------------------------------------------------------

export const HELP_TEXT =
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
  '💬 *Kirim teks* tanpa command → jadi stiker\n' +
  '↩️ *Reply foto* + `/stiker teks` → foto + teks\n' +
  '↩️ *Reply foto* + `/warna pink teks` → foto berwarna';

export const DAFTAR_TEXT =
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

export function colorListText() {
  return (
    '🎨 *Format:* `/warna <nama|hex> teks kamu`\n\n' +
    '*Nama warna:*\n' +
    '`brat` `lime` `bubble` `sky` `grape` `sun` `mint`\n' +
    '`mono` `ink` `sunset` `aqua` `hotpink` `blood`\n\n' +
    '*Atau hex bebas:*\n' +
    '`/warna #ff7a45 halo`\n' +
    '`/warna #A8E10C brat`'
  );
}

/**
 * Parse pesan jadi intent bot.
 * @param {string} rawText  teks pesan (bisa kosong kalo cuma foto)
 * @param {object} opts
 * @param {boolean} opts.hasPhoto    pesan berisi foto
 * @param {string|null} opts.replyHasPhoto  pesan me-reply foto
 * @param {string|null} opts.replyText      teks pesan yang di-reply
 */
export function parse(rawText, opts = {}) {
  const { hasPhoto = false, replyHasPhoto = false, replyText = null } = opts;
  const text = (rawText || '').trim();

  // ---- mode foto (bukan command) ----
  if (!text.startsWith('/')) {
    if (hasPhoto) {
      return { action: 'sticker', text: text || 'brat', color: 'brat', withPhoto: true };
    }
    if (text) {
      // teks biasa -> stiker; cek reply text buat warna
      return { action: 'sticker', text, color: 'brat', withPhoto: false };
    }
    return { action: 'ignore' };
  }

  const parts = text.split(/\s+/);
  const cmd = parts[0].split('@')[0].toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  switch (cmd) {
    case '/start':
    case '/help':
      return { action: 'help' };

    case '/daftar':
    case '/commands':
      return { action: 'daftar' };

    case '/ping':
      return { action: 'ping' };

    case '/warna': {
      if (!arg) return { action: 'warnahelp' };
      const seg = arg.split(/\s+/);
      const kode = seg[0];
      const isi = seg.slice(1).join(' ').trim();
      if (!isi) return { action: 'warnahelp' };
      return {
        action: 'sticker',
        text: isi,
        color: kode,
        withPhoto: replyHasPhoto,
      };
    }

    case '/stiker':
    case '/s':
    case '/ganti': {
      // "/stiker pink halo" -> warna opsional di depan
      let color = 'brat';
      let isi = arg;
      if (arg) {
        const seg = arg.split(/\s+/);
        if (looksLikeColor(seg[0])) {
          color = seg[0];
          isi = seg.slice(1).join(' ').trim();
        }
      }
      if (!isi && !replyHasPhoto) {
        return { action: 'error', message: 'Cara pakai: `/stiker teks kamu`' };
      }
      return {
        action: 'sticker',
        text: isi || replyText || 'brat',
        color,
        withPhoto: replyHasPhoto,
      };
    }

    default:
      return { action: 'error', message: `❓ Command \`${cmd}\` gak ada.\n\n${HELP_TEXT}` };
  }
}

function looksLikeColor(token) {
  if (!token) return false;
  if (COLORS_LOOKUP[token.toLowerCase()]) return true;
  return /^#?[0-9a-f]{6}$/i.test(token);
}

// cache nama warna supaya ga circular import
const COLORS_LOOKUP = {
  brat: 1, lime: 1, bubble: 1, sky: 1, grape: 1, sun: 1, mint: 1,
  mono: 1, ink: 1, sunset: 1, aqua: 1, hotpink: 1, blood: 1,
};

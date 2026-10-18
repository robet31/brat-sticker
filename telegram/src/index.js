import { renderSticker, resolveColor, COLORS } from './render.js';

const API = 'https://api.telegram.org/bot';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      if (url.pathname === '/health')
        return json({ ok: true, bot: 'brat-bot', colors: Object.keys(COLORS) });
      return json({
        ok: true,
        hint: 'Telegram webhook harus POST ke /webhook',
        setup: 'curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook"',
      });
    }

    if (url.pathname === '/webhook' && req.method === 'POST') {
      let update;
      try {
        update = await req.json();
      } catch {
        return json({ ok: false }, 400);
      }
      ctx.waitUntil(handle(update, env));
      return json({ ok: true });
    }

    return json({ ok: false, err: 'not found' }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/* ------------------------------ telegram api ------------------------------ */

async function tg(token, method, payload) {
  const res = await fetch(`${API}${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) console.error('tg error', method, data.description);
  return data;
}

async function sendMessage(token, chat_id, text, extra = {}) {
  return tg(token, 'sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });
}

async function sendPhoto(token, chat_id, photo, caption, extra = {}) {
  return tg(token, 'sendPhoto', {
    chat_id,
    photo,
    caption,
    parse_mode: 'HTML',
    ...extra,
  });
}

async function sendSticker(token, chat_id, png, extra = {}) {
  // kirim sebagai sticker webp 512x512 (butuh webp encoder; fallback ke photo)
  return tg(token, 'sendPhoto', {
    chat_id,
    photo: png,
    caption: extra.caption,
    parse_mode: 'HTML',
    ...extra,
  });
}

/* ------------------------------- dispatcher ------------------------------- */

async function handle(update, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return console.error('TELEGRAM_BOT_TOKEN belum di-set');

  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;
  const chatId = String(msg.chat.id);

  // filter chat kalau dikunci
  if (env.TELEGRAM_CHAT_ID && env.TELEGRAM_CHAT_ID !== chatId) return;

  const text = (msg.text || msg.caption || '').trim();
  const hasPhoto = !!(msg.photo && msg.photo.length);
  const replyPhotoId = msg.reply_to_message?.photo?.length
    ? msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id
    : null;

  try {
    /* ---- commands ---- */
    if (text.startsWith('/')) {
      const [rawCmd, ...rest] = text.split(/\s+/);
      const cmd = rawCmd.split('@')[0].toLowerCase();
      const arg = rest.join(' ').trim();

      if (cmd === '/start' || cmd === '/help')
        return sendMessage(token, chatId, HELP);

      if (cmd === '/daftar' || cmd === '/commands')
        return sendMessage(token, chatId, DAFTAR);

      if (cmd === '/ping')
        return sendMessage(token, chatId, 'pong 🟢 <i>' + new Date().toISOString() + '</i>');

      if (cmd === '/warna') {
        if (!arg) return sendMessage(token, chatId, WARNA_HELP);
        const [kode, ...sisa] = arg.split(/\s+/);
        const warna = resolveColor(kode);
        if (!warna)
          return sendMessage(token, chatId, `❌ Warna <code>${esc(kode)}</code> gak dikenal.`);
        const isi = sisa.join(' ').trim();
        if (!isi) return sendMessage(token, chatId, WARNA_HELP);
        const png = await renderSticker({
          text: isi,
          color: warna,
          photoDataUri: replyPhotoId ? await photoUri(token, replyPhotoId) : null,
        });
        return sendSticker(token, chatId, png, { caption: cap(warna, isi) });
      }

      if (cmd === '/stiker' || cmd === '/s' || cmd === '/ganti') {
        const warna = resolveColor(/^\w+\s/.test(arg) ? arg.split(/\s+/)[0] : null) || COLORS.brat;
        const isi = (arg.match(/^\w+\s/) && resolveColor(arg.split(/\s+/)[0]))
          ? arg.split(/\s+/).slice(1).join(' ')
          : arg;
        if (!isi && !replyPhotoId)
          return sendMessage(token, chatId, '⚠️ Cara pakai: <code>/stiker teks kamu</code>');
        const png = await renderSticker({
          text: isi || 'brat',
          color: warna,
          photoDataUri: replyPhotoId ? await photoUri(token, replyPhotoId) : null,
        });
        return sendSticker(token, chatId, png, { caption: cap(warna, isi || 'brat') });
      }

      return sendMessage(token, chatId, `❓ Command <code>${esc(cmd)}</code> gak ada.\n\n${HELP}`);
    }

    /* ---- foto (dengan atau tanpa caption) ---- */
    if (hasPhoto) {
      const biggest = msg.photo[msg.photo.length - 1];
      const uri = await photoUri(token, biggest.file_id);
      const isi = msg.caption?.trim() || 'brat';
      const png = await renderSticker({ text: isi, color: COLORS.brat, photoDataUri: uri });
      return sendSticker(token, chatId, png, { caption: cap(COLORS.brat, isi) });
    }

    /* ---- teks biasa tanpa command ---- */
    if (text) {
      const png = await renderSticker({ text, color: COLORS.brat });
      return sendSticker(token, chatId, png, { caption: cap(COLORS.brat, text) });
    }
  } catch (err) {
    console.error('handle error', err);
    return sendMessage(token, chatId, '❌ Gagal bikin stiker: <code>' + esc(err.message) + '</code>');
  }
}

/* -------------------------------- helpers --------------------------------- */

async function photoUri(token, fileId) {
  const info = await tg(token, 'getFile', { file_id: fileId });
  if (!info.ok) throw new Error('gagal ambil file foto');
  const url = `${API}${token}/file/${info.result.file_path}`;
  const r = await fetch(url);
  const buf = new Uint8Array(await r.arrayBuffer());
  const mime = sniffMime(buf);
  return `data:${mime};base64,${btoa(String.fromCharCode(...chunk(buf)))}`;
}

function chunk(u8, size = 0x8000) {
  const out = [];
  for (let i = 0; i < u8.length; i += size) out.push(u8.subarray(i, i + size));
  return out;
}

function sniffMime(u8) {
  if (u8[0] === 0x89 && u8[1] === 0x50) return 'image/png';
  if (u8[0] === 0xff && u8[1] === 0xd8) return 'image/jpeg';
  if (u8[0] === 0x47 && u8[1] === 0x49) return 'image/gif';
  if (
    u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50
  ) return 'image/webp';
  return 'image/png';
}

function cap(warna, isi) {
  return `<b>brat</b> • ${esc(String(isi).slice(0, 80))} • <code>${warna.bg}</code>`;
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* --------------------------------- texts ---------------------------------- */

const WARNA_HELP =
  '🎨 <b>Pakai warna</b>\n' +
  'Format: <code>/warna &lt;nama|hex&gt; teks kamu</code>\n\n' +
  'Nama: <code>brat</code> <code>lime</code> <code>bubble</code> <code>sky</code> ' +
  '<code>grape</code> <code>sun</code> <code>mint</code> <code>mono</code> ' +
  '<code>ink</code> <code>sunset</code> <code>aqua</code>\n' +
  'atau hex bebas: <code>/warna #ff7a45 halo</code>';

const DAFTAR =
  '📋 <b>Daftar command</b>\n\n' +
  '<code>/stiker &lt;teks&gt;</code> — stiker teks BRAT\n' +
  '<code>/warna &lt;nama|hex&gt; &lt;teks&gt;</code> — stiker berwarna\n' +
  '<code>/daftar</code> — daftar ini\n' +
  '<code>/ping</code> — cek bot masih hidup\n' +
  '<code>/start</code> — bantuan\n\n' +
  '📷 <b>Kirim foto</b> langsung aja — jadi stiker 512×512.\n' +
  '💬 <b>Kirim teks</b> tanpa command — juga jadi stiker.\n' +
  '↩️ <b>Reply foto</b> + <code>/stiker teks</code> — foto + teks.\n' +
  '↩️ <b>Reply foto</b> + <code>/warna pink teks</code> — versi berwarna.';

const HELP =
  '👋 <b>BRAT sticker bot</b>\n\n' +
  'Kirim teks atau foto, aku jadiin stiker BRAT 512×512.\n\n' + DAFTAR.split('\n\n')[1];

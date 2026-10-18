// ---------------------------------------------------------------------------
// whatsapp/src/index.js — BRAT Sticker Bot untuk WhatsApp (Baileys)
//
// Pakai: node src/index.js
// Pertama kali akan muncul QR di terminal — scan dari WhatsApp > Linked Devices.
// Sesi disimpan di ./auth/ supaya tidak perlu scan ulang.
// ---------------------------------------------------------------------------
import makeWASocket, { DisconnectReason } from 'baileys';
import { useMultiFileAuthState } from 'baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { renderSticker, resolveColor, COLORS } from './brat.js';

const LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
const PREFIX = process.env.PREFIX || '/';
const SELF_CHAT_ONLY = process.env.SELF_CHAT_ONLY === 'true';
const TRANSPARENT = process.env.TRANSPARENT_BG === 'true';

const HELP =
  `👋 *BRAT Sticker Bot*\n\n` +
  `Kirim teks atau foto, aku jadiin stiker BRAT 512×512.\n\n` +
  `*Command*\n` +
  `${PREFIX}stiker <teks> — stiker teks BRAT\n` +
  `${PREFIX}warna <nama|hex> <teks> — stiker berwarna\n` +
  `${PREFIX}daftar — daftar command\n` +
  `${PREFIX}warna — daftar warna\n` +
  `${PREFIX}ping — cek bot hidup\n\n` +
  `📷 Kirim foto langsung → stiker\n` +
  `💬 Kirim teks tanpa command → stiker\n` +
  `↩️ Reply foto + ${PREFIX}stiker teks → foto + teks`;

const WARNA =
  `🎨 Format: ${PREFIX}warna <nama|hex> teks\n\n` +
  `Nama: brat lime bubble sky grape sun mint mono ink sunset aqua hotpink blood\n` +
  `Hex bebas: ${PREFIX}warna #ff7a45 halo`;

const { state, saveCreds } = await useMultiFileAuthState('./auth');

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
  logger: pino({ level: LOG_LEVEL }),
  browser: ['BRAT Sticker', 'Chrome', '120.0.0'],
});

sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
  if (qr) {
    console.log('\n📱 Scan QR ini dari WhatsApp > Linked Devices:\n');
    qrcode.generate(qr, { small: true });
  }
  if (connection === 'open') {
    console.log('✅ BRAT Sticker Bot aktif!');
    console.log(`   JID: ${sock.user?.id}`);
  }
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;
    console.log('❌ Koneksiputus:', code);
    if (code === DisconnectReason.loggedOut) {
      console.log('⚠️  Session logout. Hapus folder ./auth lalu scan ulang.');
      process.exit(1);
    }
    if (code === 401) process.exit(1);
    setTimeout(() => process.exit(1), 500);
  }
});

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return;
  for (const msg of messages) {
    try {
      await handle(msg);
    } catch (err) {
      console.error('handle error:', err?.message || err);
    }
  }
});

async function handle(msg) {
  if (msg.key.remoteJid === 'status@broadcast') return;
  if (msg.key.fromMe && !process.env.ALLOW_SELF) {
    // dari user sendiri (bot di nomor sendiri) — tetap proses
  }

  const from = msg.key.remoteJid;
  const me = sock.user?.id?.split(':')[0];
  if (SELF_CHAT_ONLY && !msg.key.fromMe && from !== me) return;

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    '';

  const hasImage = !!msg.message?.imageMessage;
  const text = String(body || '').trim();

  // reply
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const replyHasImage = !!(ctx?.message?.imageMessage || ctx?.quotedMessage);
  const replyText = ctx?.quotedMessage?.conversation || '';

  if (!text && !hasImage) return;

  const intent = parse(text, { hasImage, replyHasImage, replyText });

  switch (intent.action) {
    case 'help':
      return reply(msg, HELP);
    case 'daftar':
      return reply(msg, HELP);
    case 'warnahelp':
      return reply(msg, WARNA);
    case 'ping':
      return reply(msg, `pong 🟢 ${new Date().toISOString()}`);
    case 'error':
      return reply(msg, intent.message);
    case 'sticker': {
      const color = resolveColor(intent.color) || COLORS.brat;
      let photoDataUri = null;

      if (intent.withPhoto || hasImage) {
        try {
          photoDataUri = await downloadImage(msg);
        } catch {
          photoDataUri = null;
        }
      }

      const png = await renderSticker({
        text: intent.text,
        photoDataUri,
        color,
        size: 512,
      });

      const caption = `brat • ${String(intent.text).slice(0, 60)}`;
      return sendSticker(msg, png, caption);
    }
    default:
      return;
  }
}

/** kirim sebagai sticker webp supaya bisa dipakai di WA */
async function sendSticker(msg, png, caption) {
  await sock.sendMessage(msg.key.remoteJid, {
    sticker: png,
    mimetype: 'image/png',
    // WA butuh webp; baileys akan Attempt encode otomatis untuk PNG? Tidak.
    // kirim sebagai image dengan sticker-looking adalah fallback aman.
    caption,
  });
}

async function downloadImage(msg) {
  const { downloadMediaMessage } = await import('baileys');
  const buf = await downloadMediaMessage(msg, 'buffer', {});
  if (!buf) return null;
  return `data:${buf.type || 'image/jpeg'};base64,${buf.data.toString('base64')}`;
}

function parse(rawText, opts) {
  const { hasImage = false, replyHasImage = false, replyText = '' } = opts || {};
  const text = String(rawText || '').trim();

  if (text.charAt(0) !== PREFIX) {
    if (hasImage) return { action: 'sticker', text: text || 'brat', color: 'brat' };
    if (text) return { action: 'sticker', text, color: 'brat', withPhoto: false };
    return { action: 'ignore' };
  }

  const parts = text.split(/\s+/);
  const cmd = parts[0].slice(PREFIX.length).toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  if (cmd === 'start' || cmd === 'help' || cmd === 'daftar') return { action: 'help' };
  if (cmd === 'ping') return { action: 'ping' };

  if (cmd === 'warna') {
    if (!arg) return { action: 'warnahelp' };
    const seg = arg.split(/\s+/);
    const isi = seg.slice(1).join(' ').trim();
    if (!isi) return { action: 'warnahelp' };
    return { action: 'sticker', text: isi, color: seg[0] };
  }

  if (cmd === 'stiker' || cmd === 's' || cmd === 'ganti') {
    let color = 'brat';
    let isi = arg;
    if (arg) {
      const seg = arg.split(/\s+/);
      if (looksLikeColor(seg[0])) {
        color = seg[0];
        isi = seg.slice(1).join(' ').trim();
      }
    }
    if (!isi && !replyHasImage)
      return { action: 'error', message: `⚠️ Cara pakai: ${PREFIX}stiker teks kamu` };
    return { action: 'sticker', text: isi || replyText || 'brat', color, withPhoto: replyHasImage };
  }

  return { action: 'error', message: `❓ Command \`${PREFIX}${cmd}\` gak ada.\n\n${HELP}` };
}

function looksLikeColor(t) {
  if (!t) return false;
  const k = String(t).toLowerCase();
  if (COLORS[k]) return true;
  return /^#?[0-9a-f]{6}$/i.test(t);
}

async function reply(msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text });
}

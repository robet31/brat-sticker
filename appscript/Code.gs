// ---------------------------------------------------------------------------
// Code.gs — BRAT Sticker Bot (Apps Script / Telegram)
//
// Deploy: Deploy > New deployment > Web app > Execute as Me > Anyone
// Lalu jalankan installTrigger() 1x supaya polling jalan terus.
// ---------------------------------------------------------------------------

const PROPS = PropertiesService.getScriptProperties();
const SS_ID = PROPS.getProperty('SPREADSHEET_ID');
const SS = SS_ID ? SpreadsheetApp.openById(SS_ID) : SpreadsheetApp.getActiveSpreadsheet();

function cfg(key, fallback) {
  const v = PROPS.getProperty(key);
  return v !== null && v !== '' ? v : fallback;
}

/* ============================== WEBHOOK (opsional) ======================== */

function doGet(e) {
  if (e && e.parameter && e.parameter.setup === '1') {
    return HtmlService.createHtmlOutput(setupPage());
  }
  return serveApp();
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) return ContentService.createTextOutput('ok');
  try {
    const update = JSON.parse(e.postData.contents);
    if (update && update.message) handleUpdate(update.message);
  } catch (err) {
    console.error('doPost error: ' + err);
  }
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

function serveApp() {
  return HtmlService.createHtmlOutput(indexHtml())
    .setTitle('BRAT Sticker Bot')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function setupPage() {
  return HtmlService.createHtmlOutput(setupPageHtml());
}

/* ================================ POLLING ================================= */

function installTrigger() {
  // hapus trigger lama biar tidak dobel
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((t) => {
    if (t.getHandlerFunction() === 'pollUpdates') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('pollUpdates').timeBased().everyMinutes(1).create();
  console.log('trigger terpasang: pollUpdates tiap 1 menit');
}

function pollUpdates() {
  const token = cfg('TELEGRAM_BOT_TOKEN', '');
  if (!token) return;

  const offset = Number(PROPS.getProperty('OFFSET') || 0);
  try {
    const res = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + token + '/getUpdates?timeout=0&offset=' + offset,
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(res.getContentText());
    if (!data.ok || !data.result || !data.result.length) return;

    let next = offset;
    for (const update of data.result) {
      next = update.update_id + 1;
      if (update.message) {
        try {
          handleUpdate(update.message);
        } catch (err) {
          console.error('handleUpdate: ' + err);
        }
      }
    }
    PROPS.setProperty('OFFSET', String(next));
  } catch (err) {
    console.error('poll error: ' + err);
  }
}

/* ============================== DISPATCHER =============================== */

function handleUpdate(msg) {
  const token = cfg('TELEGRAM_BOT_TOKEN', '');
  if (!token) return;

  // Batasi chat kalau ALLOWED_CHAT_ID diisi (kosong = semua orang bisa pakai)
  const allowed = cfg('ALLOWED_CHAT_ID', '');
  if (allowed && String(msg.chat.id) !== allowed) return;

  const chatId = String(msg.chat.id);
  const text = (msg.text || msg.caption || '').trim();
  const hasPhoto = !!(msg.photo && msg.photo.length);
  const reply = msg.reply_to_message || {};
  const replyPhoto = !!(reply.photo && reply.photo.length);

  const intent = parseIntent(text, { hasPhoto, replyPhoto, replyText: (reply.text || '').trim() });

  switch (intent.action) {
    case 'help':
      sendMsg(token, chatId, HELP_TEXT);
      return;

    case 'daftar':
      sendMsg(token, chatId, DAFTAR_TEXT);
      return;

    case 'ping':
      sendMsg(token, chatId, 'pong 🟢 ' + new Date().toISOString());
      return;

    case 'warnahelp':
      sendMsg(token, chatId, colorListText());
      return;

    case 'error':
      sendMsg(token, chatId, intent.message);
      return;

    case 'stiker':
    case 'sticker': {
      const opts = resolveStickerOpts(intent);
      try {
        const blob = stickerBlob(intent.text, opts);
        sendPhoto(token, chatId, blob, captionFor(intent.text, opts.bg));
      } catch (err) {
        console.error('render error: ' + err);
        sendMsg(token, chatId, '❌ Gagal bikin stiker: ' + err);
      }
      return;
    }

    default:
      return;
  }
}

function resolveStickerOpts(intent) {
  const c = resolveColor(intent.color);
  const transparent = cfg('TRANSPARENT_BG', 'false') === 'true';
  return {
    bg: c.bg,
    fg: c.fg,
    transparent: transparent,
    size: Number(cfg('STICKER_SIZE', '512')),
  };
}

function captionFor(text, bg) {
  const t = String(text).replace(/[<>&]/g, '').slice(0, 90);
  return 'brat • ' + t + ' • ' + bg;
}

/* ============================== TELEGRAM API ============================== */

function sendMsg(token, chatId, text) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
    muteHttpExceptions: true,
  });
}

function sendPhoto(token, chatId, blob, caption) {
  const boundary = 'brat' + Date.now();
  const parts = [];

  parts.push('--' + boundary + '\r\n');
  parts.push('Content-Disposition: form-data; name="chat_id"\r\n\r\n' + chatId + '\r\n');

  if (caption) {
    parts.push('--' + boundary + '\r\n');
    parts.push('Content-Disposition: form-data; name="caption"\r\n\r\n' + caption + '\r\n');
  }

  parts.push('--' + boundary + '\r\n');
  parts.push('Content-Disposition: form-data; name="photo"; filename="brat.png"\r\n');
  parts.push('Content-Type: image/png\r\n\r\n');
  parts.push(blob.getBytes());
  parts.push('\r\n--' + boundary + '--\r\n');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
    method: 'post',
    contentType: 'multipart/form-data; boundary=' + boundary,
    payload: toByteArraySafe(parts),
    muteHttpExceptions: true,
  });
}

/** Gabung array (string & byte[]) jadi byte[] UTF-8 aman */
function toByteArraySafe(parts) {
  const out = [];
  for (const p of parts) {
    if (typeof p === 'string') {
      const enc = Utilities.newBlob(p, 'text/plain').getBytes();
      for (const b of enc) out.push(b & 0xff);
    } else {
      for (const b of p) out.push(b & 0xff);
    }
  }
  return out;
}

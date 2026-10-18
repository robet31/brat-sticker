# BRAT Sticker

Bot **link-in-bio + generator stiker BRAT** dalam satu repo. Dua target deploy:

| Folder | Target | Webhook | Render | Biaya |
|---|---|---|---|---|
| `telegram/` | Telegram Bot API | ✅ Cloudflare Worker | satori + resvg | Gratis |
| `whatsapp/` | WhatsApp (Baileys) | ❌ polling socket | satori + resvg | Gratis (self-host) |
| `appscript/` | Google Apps Script | ⚠️ polling 1 menit | PNG encoder sendiri | Gratis |

Plus `lollipop/` — web link-in-bio (LinkedIn / Instagram / WhatsApp / promo) yang dipakai buat QR code.

---

## 1. Telegram Bot (Cloudflare Worker) — paling recommended

Paling stabil: webhook resmi, tanpa scan QR, sleep 0, gratfull 100k request/hari.

### Deploy

```bash
cd telegram
npm install
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler deploy
```

Lalu daftarkan webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<worker>.workers.dev/webhook"
```

### Command

| Command | Fungsi |
|---|---|
| `/stiker <teks>` | stiker teks BRAT |
| `/warna <nama\|hex> <teks>` | stiker berwarna |
| `/daftar` | daftar command |
| `/ping` | health check |
| `/start` | bantuan |

Kirim **foto** langsung → jadi stiker. **Reply foto** + `/stiker teks` → foto + teks.

### Warna

`brat` `lime` `bubble` `sky` `grape` `sun` `mint` `mono` `ink` `sunset` `aqua` `hotpink` `blood`

Hex bebas: `/warna #ff7a45 halo`

---

## 2. WhatsApp Bot (Baileys)

Unofficial. Scan QR sekali, sesi disimpan di `whatsapp/auth/`.

### Jalan lokal

```bash
cd whatsapp
npm install
node src/index.js
```

Scan QR dari **WhatsApp > Linked Devices > Link a Device**.

### Deploy ke Railway

```bash
cd whatsapp
npm install
npx @railway/cli init
npx @railway/cli up
```

Set volume untuk `auth/` supaya session tidak hilang saat restart.

### ⚠️ Peringatan

- WhatsApp bisa memblokir akun unofficial. **Jangan pakai nomor utama.**
- Reconnect otomatis akan memperpendek umur session.
- Untuk production, pakai WhatsApp Business API resmi.

---

## 3. Apps Script (fallback, tanpa Node)

Kalau sama sekali nggak bisa Jalankan Node/Worker, versi ini jalan 100% di Google Apps Script.

### Cara install

1. https://script.google.com > New project
2. Paste 3 file: `Code.gs`, `Stiker.gs`, `Parsing.gs`
3. **Project Settings > Script Properties** — tambahkan:

| Key | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token dari @BotFather |
| `ALLOWED_CHAT_ID` | chat ID kamu (kosong = semua boleh) |
| `TRANSPARENT_BG` | `true` kalau mau bg transparan |
| `STICKER_SIZE` | `512` |

4. Deploy > New deployment > **Web app** > Execute as **Me** > Who has access **Anyone**
5. Jalankan fungsi `installTrigger()` 1x ( authorizing) — ini menyalakan polling

### Kenapa polling, bukan webhook?

Apps Script tidak bisa menerima push. Jadi bot memakai `getUpdates` tiap 1 menit → **delay 1-5 menit** per stiker. Tetap jalan, cuma lambat.

### Kenapa PNG encoder sendiri?

Apps Script tidak punya canvas. Daripada panggil service pihak ketiga (privacy + ketergantungan), `Stiker.gs` meng-encode PNG sendiri:

- Font bitmap 5×7 (built-in, lowercase gaya BRAT)
- Palet PNG color type 3 + `tRNS` untuk transparansi
- Deflate "stored block" — tanpa kompresi tapi valid, hemat kode

Hasilnya pixel-art, bukan font Archivo Black seperti versi Worker. Itu konsekuensi pure-Apps-Script.

---

## Struktur

```
brat-sticker/
├── telegram/          Worker (Cloudflare)
│   └── src/index.js
├── whatsapp/          Node + Baileys
│   └── src/index.js
├── appscript/         Pure Apps Script
│   ├── Code.gs
│   ├── Stiker.gs      PNG encoder + font bitmap
│   └── Parsing.gs
├── lollipop/          Link-in-bio untuk QR card
└── shared/            Parser, palette, font
```

---

## Stiker dari Telegram ke WhatsApp

Format berbeda, tapi PNG 512×512 hasil bot ini bisa dipakai di keduanya:

| | Telegram | WhatsApp |
|---|---|---|
| Stiker `.tgs` animasi | ✅ | ❌ |
| WebP / PNG 512×512 | ✅ | ✅ (lewat Stickerly / convert manual) |

Cara pakai di WhatsApp: terima PNG → simpan → buka **Stickerly** atau tool konverter → add ke sticker set kamu.

---

## Environment variables

### Telegram Worker

```bash
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=123456789   # opsional: kunci chat
```

### WhatsApp Node

```bash
PREFIX=/
SELF_CHAT_ONLY=true
TRANSPARENT_BG=false
LOG_LEVEL=silent
```

---

## License

MIT — pakai bebas.

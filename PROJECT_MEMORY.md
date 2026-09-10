# 🧠 Central Project Memory — ALEX CINEMA MASTER ARCHITECTURE & MEMORY

> **The comprehensive, definitive engineering reference for the AleX Cinema platform and its associated systems.**
> *This document is designed to serve as the primary guide for any developer or AI assistant resuming work on the project to ensure architecture, security, and standard design specifications are rigorously maintained.*

---

## 📌 1. Ecosystem Overview

The **ALEX CINEMA** platform is an advanced, ultra-fast cinematic streaming platform designed for both social group watching and individual viewing. It is connected to a hybrid cloud network and deeply integrated as a Telegram Mini App (Telegram WebApp), featuring live streaming servers, real-time synchronization servers, and a sophisticated proxy network for the Cinemana / Shabakaty network.

### Repositories Map:
1. **Core Repository (Web + Sockets + Mini App):** [`Gaoc3/alex-cinema`](https://github.com/Gaoc3/alex-cinema) (Primary branch: `main`).
2. **Media Downloader & Music Bot (Mtsky-AI):** [`Gaoc3/AIBOT`](https://github.com/Gaoc3/AIBOT) (Directory: `Mtsky-AI/`).
3. **Synchronized Lyrics API:** [`Gaoc3/Api-Lyrics`](https://github.com/Gaoc3/Api-Lyrics).

### Domains & Runtime Environment:
* **Production Public Domains:** `https://cinax.live` and `https://www.cinax.live`
* **Supported Operating System:** Ubuntu / Debian LTS (Linux)
* **Default Server Paths:** `/root/alex-cinema` or `/opt/alex-cinema`

---

## 🏗️ 2. Architecture & PM2 Processes

Platform services are managed either via **Docker Compose** (recommended production setup) or via **PM2**. Below is the table of approved core services:

| PM2 Service Name | Port / Technology | Main Path & File | Function & Technical Role |
|:-----------------|:------------------|:-----------------|:--------------------------|
| `cinemana` | Port `3000` (Next.js 16) | `/root/alex-cinema` | Main web application, user interface, and API Routes. |
| `alex-socket` | Port `4000` (Socket.io) | `socket-server.js` | Live rooms server, synchronized watch parties, and real-time chat. |
| `alex-telegram-bot` | Python 3 + Telebot | `telegram_bot.py` | Official Telegram bot launching the Web Mini App and authenticating accounts. |
| `alex-tunnel-watchdog` | Node.js Daemon (15s) | `tunnel_watchdog_vps.js` | Shabakaty tunnel health monitor and periodic cloud connection verifier. |
| `lyrics-api` | Port `8000` (FastAPI/Flask) | `/root/lyrics_api` | Fetches, formats, and serves synchronized song lyrics. |
| `yt-downloader-bot` | Python 3 + Pyrogram | `/root/AIBOT/Mtsky-AI` | Downloader & AI bot handling large file uploads via local server. |

---

## 🌐 3. Shabakaty Reverse Tunnel & DNS (Bypassing Geo-Restrictions)

### Hybrid Tunnel Mechanism:
1. **Reverse SSH Tunnel:**
   * Network traffic is routed from a router or Linux device inside the Earthlink network (Iraq) to the remote VPS server on local port `8443` (`127.0.0.1:8443`).
2. **Local DNS Hijacking (`/etc/hosts`):**
   * All domains matching `*.shabakaty.com`, `cinemana.shabakaty.com`, `cnth1..49`, and `cndw1..49` in `/etc/hosts` are pointed to `127.0.0.1`.
3. **Nginx Reverse Proxy (`nginx_vps.conf`):**
   * Receives `*.shabakaty.com` requests and proxies them to `https://127.0.0.1:8443` while passing required authentication headers (`Host`, `Referer`, `Bypass-Tunnel-Reminder`).
   * Handles video paths `/tunnel/...` to provide high-speed caching and direct stream rewrites.
   * Routes `/socket.io/` traffic to port `4000`, and all other web requests to Next.js on port `3000`.

---

## 🤖 4. Telegram Bots Ecosystem

### A. Official AleX Cinema Bot (`alex-telegram-bot`):
* **File:** `telegram_bot.py` (reads environment variables from `.env`).
* **Features:**
  * Launches the platform instantly as a **Telegram Mini App** via the `WebAppInfo(url="https://cinax.live/tg-app")` button.
  * Handles instant search commands, room sharing links, and user identity synchronization via `initData`.
  * Security headers and cloud verification via `/api/auth/telegram`.

### B. Media Downloader & Music Bot (`yt-downloader-bot` / Mtsky-AI):
* **Standalone Repository:** [`Gaoc3/AIBOT`](https://github.com/Gaoc3/AIBOT)
* **Path:** `/root/AIBOT/Mtsky-AI/main.py`
* **Features:**
  * Relies on a local Telegram Bot API server (`http://127.0.0.1:8081/bot{token}`) to upload and download large files up to 2GB.
  * Downloads video and audio from YouTube in multiple qualities, extracts audio streams, and retrieves synced lyrics.

---

## 🎨 5. Obsidian Cinema Design System

The user interface is engineered adhering strictly to the visual specifications defined in [`DESIGN.md`](DESIGN.md):

### Core Color Palette:
* **Deep Obsidian Background:** `#03060f`, `#070b13`, and `#090e1d`.
* **Primary Ruby Crimson Accent:** `#e50914` with vivid neon crimson glows and soft shadows.
* **Gold & Amber Stars:** `#fbbf24` / `#f59e0b`.
* **Typography:** `Cairo` for Arabic typography, and `SF Pro / Outfit` for numerical and English typography.

### Strict UI Laws:
1. **Zero Hover Seam Law:**
   * Absolutely no color lines, borders, or light leakage may appear below poster cards during hover/scale states.
   * Enforced via a dual obsidian mask:
     ```tsx
     <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/40 to-transparent pointer-events-none z-10" />
     <div className="absolute inset-x-0 bottom-0 h-3 bg-[#070b13] pointer-events-none z-10" />
     ```
2. **Mathematically Aligned Collapsed Sidebar (80px):**
   * Uniform button and icon dimensions: `44px × 44px` (`width: 2.75rem; height: 2.75rem;`).
   * Vertical spacing between adjacent icons: **Exactly 10px** (`gap: 0.625rem !important`).
   * Hidden submenus are completely obliterated in collapsed mode: `display: none !important; height: 0 !important;`.
3. **Series Navigator Bar:**
   * Header title and episode count badges occupy a completely independent top row to prevent visual clutter.
   * Season selector buttons sit on a dedicated, full-width frosted glass bottom track with scrollbars hidden (`hide-scrollbar`).

---

## 🔒 6. Media & Image Proxy Management

* **Internal Proxy Path:** `/api/img?type=poster&file=FILENAME`
* **Supported CDN Nodes with Automatic Failover:**
  * `cnth2.shabakaty.com`
  * `cnth1.shabakaty.com`
  * `cndw2.shabakaty.com`
  * `cndw1.shabakaty.com`
  * `cinemana.shabakaty.com`
  * `cdn.shabakaty.com`
* **Image Cache Busting:** Update the `IMAGE_CACHE_VERSION` string in `src/utils/imageHelper.ts` whenever radical visual redesigns or cache flushes are required.

---

## 🚀 7. Deployment & Build Runbook

### A. Verify Local Build:
```bash
npm run build
```

### B. Modern Production Deployment (Docker Compose):
```bash
./scripts/deploy-docker.sh
```

### C. Traditional Production Deployment (PM2):
```bash
git pull origin main
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart cinemana alex-socket alex-telegram-bot alex-tunnel-watchdog --update-env
pm2 save
```

---

## 💡 8. Instructions for Future AI Assistants

1. **Read this file first (`PROJECT_MEMORY.md`)** immediately at the start of any new session to restore full architectural context.
2. **Always preserve the luxury cinematic design identity (Obsidian Red Luxury Theme)**; never introduce washed-out grays or low-contrast backgrounds.
3. **Never commit or include real credentials, passwords, or secrets** inside repository files or markdown documents.
4. **Always verify after changes** that the codebase compiles cleanly without TypeScript errors and matches Next.js 16 route requirements before pushing updates.

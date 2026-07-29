# AleX Cinema

AleX Cinema is a real-time social streaming platform built with Next.js, React,
TypeScript, Socket.io, Prisma/PostgreSQL, Clerk, and the Telegram Mini App SDK.

Production: https://cinax.live

## Local development

```bash
npm ci
npx prisma generate
npm run dev
```

Copy `.env.example` to a local environment file and provide the required values.
Never commit production credentials.

## Authentication

- Clerk handles regular browser sign-in and sign-up.
- Telegram Mini Apps authenticate with signed `initData`.
- Browser-based Telegram login uses OIDC with state, nonce, and PKCE.
- Telegram sessions are server-signed with `TELEGRAM_SESSION_SECRET`.

Required production variables are documented in `.env.example`.

## Runtime services

- `cinemana`: Next.js application on port 3000.
- `alex-socket`: Socket.io room server on port 4000.
- `alex-telegram-bot`: Telegram Mini App bot.
- `alex-tunnel-watchdog`: Shabakaty reverse-tunnel health monitor.

## Production deployment

```bash
git fetch origin
git reset --hard origin/main
npm ci
npx prisma generate
npm run build
pm2 restart cinemana alex-socket alex-telegram-bot alex-tunnel-watchdog --update-env
pm2 save
```

Run the build before restarting services. Keep `.env`, `.env.production`, and
other server-only configuration files outside Git.

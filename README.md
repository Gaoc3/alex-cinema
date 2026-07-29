# AleX Cinema

AleX Cinema is a real-time social streaming platform built with Next.js, React,
TypeScript, Socket.io, Prisma/PostgreSQL, Clerk, and the Telegram Mini App SDK.

Production: https://cinax.live

## Local development

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The Telegram bot dependencies can be installed independently with:

```bash
python3 -m pip install -r requirements-bot.txt
```

Copy `.env.example` to a local environment file and provide the required values.
Never commit production credentials.

## Authentication

- Clerk handles regular browser sign-in and sign-up.
- Telegram Mini Apps authenticate with signed `initData`.
- Browser-based Telegram login uses OIDC with state, nonce, and PKCE.
- Telegram sessions are server-signed with `TELEGRAM_SESSION_SECRET`.
- Room sockets use short-lived, room-bound tokens signed with `SOCKET_AUTH_SECRET`.

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
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart cinemana alex-socket alex-telegram-bot alex-tunnel-watchdog --update-env
pm2 save
```

Run the build before restarting services. Keep `.env`, `.env.production`, and
other server-only configuration files outside Git.

Existing production databases created before Prisma migrations were introduced
must be baselined once before the regular deployment command is used:

```bash
npx prisma migrate resolve --applied 202607290000_baseline
npx prisma migrate deploy
```

After that one-time baseline, use `npx prisma migrate deploy` for every release.

The production Nginx server must proxy Socket.io before the general Next.js
location so real-time rooms and chat can reach `alex-socket`:

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_read_timeout 86400s;
}
```

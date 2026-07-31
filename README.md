# AleX Cinema

AleX Cinema is a real-time social streaming platform built with Next.js 16,
React 19, TypeScript, Socket.io, Prisma/PostgreSQL, Clerk, and Telegram Mini Apps.

Production: <https://cinax.live>

## Portable production stack

The repository includes a complete Docker Compose stack for disaster recovery
and migration to another Linux VPS. It starts the following components with one
command:

- automatic HTTPS edge proxy;
- internal Nginx media proxy and cache;
- Next.js application;
- Socket.io rooms and persistent chat;
- PostgreSQL and one-shot Prisma migrations;
- Telegram polling bot;
- wildcard Shabakaty DNS and TLS passthrough gateway;
- restricted reverse-SSH endpoint for the Earthlink router;
- safe tunnel health monitor;
- database backup and guarded restore jobs.

Docker Compose deliberately uses separate containers instead of one oversized
container. The operator still controls the whole platform as a single stack,
while service failures, permissions, logs, upgrades, and persistent data remain
isolated.

### First server boot

```bash
sudo ./scripts/install-docker-debian.sh
./scripts/prepare-docker.sh
nano .env.docker
./scripts/deploy-docker.sh
```

The environment file must contain no `CHANGE_ME` placeholders. The tunnel key
must also be installed on the Earthlink-connected router or Linux bridge before
Shabakaty media can work.

Full instructions:

- [Docker deployment and router setup](docs/DOCKER_DEPLOYMENT.md)
- [Disaster recovery and migration runbook](docs/DISASTER_RECOVERY.md)

## Local development

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Install the Telegram bot dependencies independently when running without
containers:

```bash
python3 -m pip install -r requirements-bot.txt
```

Copy `.env.example` to a local environment file and provide the required
values. Never commit production credentials.

## Authentication

- Clerk handles regular browser sign-in and sign-up.
- Telegram Mini Apps authenticate with signed `initData`.
- Browser Telegram login uses OIDC with state, nonce, and PKCE.
- Telegram sessions are server-signed with `TELEGRAM_SESSION_SECRET`.
- Room sockets use short-lived, room-bound tokens signed with
  `SOCKET_AUTH_SECRET`.

## Health checks

```text
GET /healthz       public edge readiness
GET /api/health    Next.js plus PostgreSQL readiness
GET /healthz       Socket service on its internal port
```

Run all container checks locally on the server:

```bash
./scripts/verify-docker.sh
```

## Database operations

Create a compressed, checksummed backup:

```bash
./scripts/backup-docker.sh
```

Backups are written below `backups/`, which is intentionally ignored by Git.
Copy them to encrypted off-server storage.

Existing production databases created before Prisma migrations were introduced
must be baselined once, only after verifying that the schema already matches:

```bash
npx prisma migrate resolve --applied 202607290000_baseline
npx prisma migrate deploy
```

Never mark the baseline as applied on a fresh empty database.

## Legacy PM2 deployment

The current VPS may continue using PM2 until an intentional Compose cutover.
Do not run the Compose public edge beside the existing Nginx on the same ports.

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

Only one Telegram polling bot and one Socket.io room server may be active for
the production environment at a time.


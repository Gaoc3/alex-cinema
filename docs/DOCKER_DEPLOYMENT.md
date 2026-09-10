# 🐳 Running AleX Cinema with Docker Compose

This deployment guide enables bootstrapping and migrating the platform to any fresh Linux host without manual service orchestration. After initial setup, updates are deployed with a single command:

```bash
./scripts/deploy-docker.sh
```

---

## 💡 Why Multi-Container Compose Instead of a Single Monolith?

The stack is orchestrated as a cohesive unit, while preserving container isolation for each service. This prevents database downtime during frontend deployments, provides isolated health checks and logging streams for each subsystem, and ensures fine-grained process restarts and resource limits. The operator retains single-command convenience with cloud-native reliability.

---

## 📐 Network & Architecture Topology

```text
Internet
  -> Caddy (:80 / :443)
       -> Nginx (:8080) -> Next.js (:3000)
       -> Socket.io (:4000)

Next.js / Socket.io -> PostgreSQL (:5432)

*.shabakaty.com
  -> CoreDNS Wildcard Resolver
  -> HAProxy TLS Passthrough (:443)
  -> Restricted Reverse SSH Tunnel (:8443)
  -> Earthlink Edge Router HAProxy (:8443)
  -> Upstream Shabakaty Host (:443)

Telegram Bot -> Telegram Bot API (Long Polling)
```

---

## 📦 Service Breakdown

| Service | Function | Public Port |
|:--------|:---------|:------------|
| `caddy` | Automatic HTTPS termination and public gateway | `80`, `443/tcp`, `443/udp` |
| `web` | Reverse proxy and high-performance media caching | None (Internal) |
| `app` | Next.js 16 fullstack application | None (Internal) |
| `socket` | Real-time rooms and synchronized chat server | None (Internal) |
| `postgres` | Persistent relational database storage | None (Internal) |
| `migrate` | One-shot Prisma schema migrations | None (Internal) |
| `bot` | Telegram Mini App companion bot | None (Internal) |
| `coredns` | Internal wildcard DNS rewriting | None (Internal) |
| `tunnel-gateway` | Raw TLS passthrough to media tunnel | None (Internal) |
| `tunnel-sshd` | Restricted reverse SSH ingress | `2222/tcp` |
| `tunnel-monitor` | Automated health monitoring daemon | None (Internal) |

> **Firewall Warning:** Never expose internal ports `3000`, `4000`, `5432`, `8080`, or `8443` to the public internet. Only ports `80`, `443`, and `2222` should be accessible externally.

---

## 🚀 Step-by-Step Installation Runbook

### 1. System Preparation (Debian / Ubuntu)
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo ./scripts/install-docker-debian.sh
```

### 2. Environment Configuration
```bash
./scripts/prepare-docker.sh
cp .env.docker.example .env.docker
nano .env.docker
```

Configure the following critical parameters in `.env.docker`:
* `DOMAIN`: Your production domain (e.g., `cinax.live`).
* `POSTGRES_PASSWORD`: Strong random database password.
* `NEXTAUTH_SECRET` / `SOCKET_AUTH_SECRET`: Strong secret keys.
* `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Clerk authentication keys.
* `TELEGRAM_BOT_TOKEN`: Token obtained from Telegram @BotFather.

### 3. Launch the Stack
```bash
./scripts/deploy-docker.sh
```

### 4. Verify Stack Health
```bash
./scripts/verify-docker.sh
```

---

## 🔄 Routine Maintenance Commands

* **View live logs:**
  ```bash
  docker compose --env-file .env.docker logs -f
  ```
* **Restart specific service:**
  ```bash
  docker compose --env-file .env.docker restart socket
  ```
* **Execute manual backup:**
  ```bash
  ./scripts/backup-docker.sh
  ```

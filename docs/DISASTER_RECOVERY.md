# 🛡️ Disaster Recovery & Server Migration Runbook

This document serves as the operational execution checklist in the event of VPS failure, host termination, or router/edge hardware replacement.

## 🎯 Operational Recovery Objectives

- **Recovery Point Objective (RPO):** Dictated by external backup frequency. Daily offsite snapshots guarantee an RPO <= 24 hours.
- **Recovery Time Objective (RTO):** 30 to 60 minutes onto a provisioned Linux host, plus backup transfer and DNS propagation time.
- **Validation Requirement:** A disaster recovery plan is not considered certified until a dry-run test restore has completed successfully on an isolated target environment.

---

## 🔐 Critical Offsite Assets (Keep Securely Stored Off-Host)

Maintain an encrypted, restricted-access vault containing:

```text
.env.docker
.env.router
docker/router/secrets/id_ed25519
docker/router/secrets/known_hosts
docker/tunnel-sshd/secrets/authorized_keys
backups/alex-cinema-*.dump
backups/alex-cinema-*.dump.sha256
```

Ensure administrative access to the following third-party management consoles:
- GitHub Repository (`Gaoc3/alex-cinema`).
- DNS / Cloudflare Zone Control.
- Clerk Production Instance.
- Telegram BotFather and OIDC applications.
- Remote PostgreSQL encrypted backup storage.
- Earthlink Router / Edge Bridge.

> **Security Rule:** Never commit secrets, private SSH keys, or environment files into version control.

---

## 🚨 Scenario 1: Complete VPS Host Loss

1. Provision a fresh Ubuntu or Debian LTS VPS.
2. Configure firewall rules to allow only inbound ports: `22`, `80`, `443`, and `2222`.
3. Lower DNS TTL in advance or prepare a test subdomain prior to cutting over public DNS.
4. Clone the repository and install Docker:
   ```bash
   git clone https://github.com/Gaoc3/alex-cinema.git /opt/alex-cinema
   cd /opt/alex-cinema
   sudo ./scripts/install-docker-debian.sh
   ```
5. Restore `.env.docker` and `docker/tunnel-sshd/secrets/authorized_keys` to their respective paths.
6. Initialize the stack via `./scripts/deploy-docker.sh`.
7. Transfer the latest verified database dump and validate its checksum:
   ```bash
   sha256sum -c backups/alex-cinema-YYYYMMDDTHHMMSSZ.dump.sha256
   ```
8. Perform database restoration:
   ```bash
   RESTORE_FILE=/backups/alex-cinema-YYYYMMDDTHHMMSSZ.dump \
   CONFIRM_RESTORE=RESTORE_ALEX_CINEMA \
   docker compose --env-file .env.docker --profile restore run --rm db-restore
   docker compose --env-file .env.docker run --rm migrate
   docker compose --env-file .env.docker restart app socket
   ```
9. Update `known_hosts` on the Earthlink edge device after verifying the new VPS host fingerprint.
10. Update `VPS_HOST` and restart the edge router Compose stack.
11. Run verification smoke tests prior to switching production DNS.

---

## 🔄 Scenario 2: Edge Router Replacement Only

When only the local edge device or router is replaced, no VPS or database changes are necessary.

1. Connect the new Linux host or Docker-enabled router to the local Earthlink ISP network.
2. Copy `compose.router.yaml` and the `docker/router/` directory.
3. Restore the private SSH tunnel key (`id_ed25519`) and `known_hosts`.
4. Configure `.env.router` with the current public VPS host address.
5. Launch the router stack and inspect connection logs:
   ```bash
   docker compose --env-file .env.router -f compose.router.yaml up -d --build
   docker compose --env-file .env.router -f compose.router.yaml logs -f
   ```

> If the private key is lost, generate a new keypair and replace the public key in `docker/tunnel-sshd/secrets/authorized_keys` on the VPS, then rebuild `tunnel-sshd`.

---

## 💾 Scenario 3: Database Migration Only

1. Generate a consistent database backup on the source host:
   ```bash
   ./scripts/backup-docker.sh
   ```
2. Verify the SHA-256 checksum of the generated archive.
3. Enable temporary maintenance mode or suspend write operations.
4. Transfer the verified dump to the target database host.
5. Restore the snapshot and execute pending migrations:
   ```bash
   RESTORE_FILE=/backups/alex-cinema-latest.dump \
   CONFIRM_RESTORE=RESTORE_ALEX_CINEMA \
   docker compose --env-file .env.docker --profile restore run --rm db-restore
   docker compose --env-file .env.docker run --rm migrate
   ```
6. Restart the application and real-time socket services.

# 📚 Technical Documentation Hub — AleX Cinema

Welcome to the **AleX Cinema** Technical Documentation Center. This directory provides operational runbooks, disaster recovery strategies, and cloud deployment guides for the platform ecosystem.

---

## 📑 Documentation Index

| Document | Path | Scope & Purpose |
|:---------|:-----|:----------------|
| 🐳 **Docker Deployment Guide** | [`DOCKER_DEPLOYMENT.md`](DOCKER_DEPLOYMENT.md) | Comprehensive runbook for deploying all services, network containers, and router edges via Docker Compose. |
| 🛡️ **Disaster Recovery Plan** | [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) | Standard Operating Procedures for VPS migration, data restoration, and failover management. |
| 🎨 **UI Design System** | [`../DESIGN.md`](../DESIGN.md) | Obsidian cinema design tokens, color palette, typography hierarchy, and strict visual guidelines. |
| 🎯 **Product Blueprint** | [`../PRODUCT.md`](../PRODUCT.md) | Platform goals, target demographics, key capabilities, and UX principles. |
| 🧠 **Central Architecture Memory** | [`../PROJECT_MEMORY.md`](../PROJECT_MEMORY.md) | Definitive reference covering ports, services, hybrid tunnels, and ecosystem repositories. |

---

## ⚡ Quick Reference Commands

### Deploy & Update Stack (Docker Compose):
```bash
./scripts/deploy-docker.sh
```

### Create Cryptographic Database Backup:
```bash
./scripts/backup-docker.sh
```

### Verify Service Health:
```bash
./scripts/verify-docker.sh
```

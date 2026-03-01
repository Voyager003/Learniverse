# Oracle Cloud Backend Deployment Guide

## 1. Overview

This project deploys with Docker on a single Oracle Cloud VM.

- Registry: GHCR
- CI/CD: GitHub Actions
- Runtime stack: NestJS + PostgreSQL + MongoDB
- Public entrypoint: `http://<oracle-public-ip>` or custom domain

## 2. Server Bootstrap

Run on Oracle VM (Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
. /etc/os-release
CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

## 3. Network and Firewall

Allow only:

- `22` (restricted source IPs only)
- `80`

Block public access to `3000`, `5432`, and `27017`.

## 4. Prepare Files

```bash
sudo mkdir -p /opt/learniverse
sudo chown -R $USER:$USER /opt/learniverse
```

Copy repository contents into `/opt/learniverse`.

Create runtime env:

```bash
cp /opt/learniverse/infra/prod/.env.prod.template /opt/learniverse/infra/prod/.env.prod
```

Update real production values in `.env.prod`.

## 5. GitHub Actions Secrets

Add these secrets in repository settings:

- `ORACLE_HOST`
- `ORACLE_USER`
- `ORACLE_SSH_KEY`
- `ORACLE_PORT`

`deploy-prod.yml` uses `GITHUB_TOKEN` for GHCR push.

## 6. Deploy Flow

1. Push to `main`
2. Workflow `Deploy Production`:
   - runs tests/build
   - builds and pushes Docker image to GHCR
   - SSH into Oracle VM and executes:

```bash
/opt/learniverse/scripts/deploy-prod.sh <image-tag>
```

## 7. Rollback

```bash
/opt/learniverse/scripts/rollback-prod.sh <previous-tag>
```

## 8. Database Migrations

Deployment runs migrations before app start:

```bash
docker compose -f infra/prod/docker-compose.prod.yml --env-file infra/prod/.env.prod run --rm app npm run migration:run:prod
```

## 9. Health Check

Application health endpoint:

- `GET /api/v1/health`

The deploy script fails if this endpoint is unhealthy.

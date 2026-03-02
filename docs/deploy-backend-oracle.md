# Oracle Cloud Backend Deployment Guide

## 1. Overview

This project deploys with Docker on a single Oracle Cloud VM.

- Registry: GHCR
- CI/CD: GitHub Actions (self-hosted runner on Oracle VM)
- Runtime stack: NestJS + PostgreSQL + MongoDB
- Public entrypoint: `https://api.<your-domain>`

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

Minimum required values:

- `APP_CORS_ORIGINS=https://<your-vercel-domain>[,https://<your-custom-frontend-domain>]`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_PASSWORD`

## 5. Register Self-Hosted Runner

Create and register a self-hosted runner on Oracle VM from:

`GitHub Repository > Settings > Actions > Runners > New self-hosted runner`

Use Linux instructions from GitHub UI, then run the service permanently:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Label the runner with:

- `self-hosted`
- `learniverse-prod`

`deploy-prod.yml` uses `GITHUB_TOKEN` for GHCR push. No SSH secrets are required.

## 6. Deploy Flow

1. Push to `main`
2. Workflow `Deploy Production`:
   - runs tests/build
   - builds and pushes Docker image to GHCR
   - self-hosted runner on Oracle VM executes:

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

## 10. Frontend Integration

Set Vercel Production Environment Variable:

- `NEXT_PUBLIC_API_URL=https://api.<your-domain>/api/v1`

After changing env values, redeploy frontend and verify:

- login
- token refresh
- authenticated APIs (e.g. `/users/me`)

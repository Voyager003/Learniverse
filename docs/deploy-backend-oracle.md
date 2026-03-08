# Oracle Cloud Backend Deployment Guide

## 1. Overview

This project deploys with Docker Compose on a single Oracle Cloud VM.

- Registry: GHCR
- CI/CD: GitHub Actions (self-hosted runner on Oracle VM)
- Runtime stack: NestJS + PostgreSQL + MongoDB + Nginx
- TLS: Let's Encrypt (Certbot webroot)
- Public entrypoint: `https://api.<your-domain>`

Production runtime is split by role:

- `nginx`: reverse proxy and TLS termination
- `app`: NestJS API runtime
- `postgres`: relational data store
- `mongodb`: document data store
- `certbot`: certificate issuance and renewal helper

Network layout:

- `edge`: `nginx`, `app`, `certbot`
- `internal`: `app`, `postgres`, `mongodb`

Only `80/443` are publicly exposed. `3000`, `5432`, and `27017` remain private.

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

Re-login after `usermod` so your user can run Docker without `sudo`.

## 2-1. VM Hardening for 1GB Instances

If you run this stack on a 1GB Oracle VM, add swap and configure Docker log rotation before the first production deploy.

### Add 2GB swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Configure Docker log rotation

```bash
sudo mkdir -p /etc/docker
cat <<'JSON' | sudo tee /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON

sudo systemctl restart docker
```

## 3. Network and Firewall

Allow only:

- `22` (restricted source IPs only)
- `80` (HTTP + ACME challenge)
- `443` (HTTPS)

Do not open `3000`, `5432`, `27017` publicly.

If you also use `ufw`, mirror the same policy:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 4. Prepare Files and Environment

```bash
sudo mkdir -p /opt/learniverse
sudo chown -R $USER:$USER /opt/learniverse
```

Copy repository contents into `/opt/learniverse`, then create runtime env:

```bash
cp /opt/learniverse/infra/prod/.env.prod.template /opt/learniverse/infra/prod/.env.prod
```

Set production values in `.env.prod`:

- `API_DOMAIN=api.<your-domain>`
- `LETSENCRYPT_EMAIL=<your-email>`
- `APP_CORS_ORIGINS=https://<your-vercel-domain>[,https://<your-other-frontend-domain>]`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_PASSWORD`

Keep these host values as the Compose service names:

- `DB_HOST=postgres`
- `DB_PORT=5432`
- `MONGODB_URI=mongodb://mongodb:27017/learniverse`

## 5. Issue First TLS Certificate

Run once after DNS A record for `api.<your-domain>` points to your Oracle VM public IP.

```bash
cd /opt/learniverse
./scripts/init-letsencrypt.sh
```

What this does:

1. Starts Nginx in HTTP mode for ACME challenge
2. Issues certificate via Certbot (`webroot`)
3. Restarts Nginx in HTTPS mode

Verify:

```bash
curl -I https://api.<your-domain>/api/v1/health
```

## 6. Register Self-Hosted Runner

Create and register a self-hosted runner from:

`GitHub Repository > Settings > Actions > Runners > New self-hosted runner`

Then install/start as a service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Required labels:

- `self-hosted`
- `learniverse-prod`

`deploy-prod.yml` uses `GITHUB_TOKEN` for GHCR push. No SSH secrets are required.

## 7. Deploy Flow

1. Push to `main`
2. Workflow `Deploy Production`:
   - runs lint/tests/build
   - builds and pushes Docker image to GHCR
   - self-hosted runner executes:

```bash
/opt/learniverse/scripts/deploy-prod.sh <image-tag>
```

Deploy script behavior:

- pulls new app image
- runs DB services and migrations
- starts `app` first and waits for app health
- starts `nginx` after the app is healthy
- checks app health and nginx proxy health

## 8. Automatic Certificate Renewal

Run renewal once to confirm:

```bash
cd /opt/learniverse
./scripts/renew-letsencrypt.sh
```

Then register cron (daily at 03:17):

```bash
crontab -e
```

```cron
17 3 * * * cd /opt/learniverse && ./scripts/renew-letsencrypt.sh >> /var/log/learniverse-cert-renew.log 2>&1
```

## 9. Rollback

```bash
cd /opt/learniverse
./scripts/rollback-prod.sh <previous-tag>
```

## 10. Frontend Integration (Vercel)

Set Vercel Production Environment Variable:

- `NEXT_PUBLIC_API_URL=https://api.<your-domain>/api/v1`

After changing env values, redeploy frontend and verify:

- login
- token refresh
- authenticated APIs (`/users/me`)
- no CORS or Mixed Content errors in browser devtools

## 11. Post-Deploy Verification

Run these checks on the Oracle VM after each deployment:

```bash
cd /opt/learniverse
docker compose -f infra/prod/docker-compose.prod.yml ps
docker compose -f infra/prod/docker-compose.prod.yml logs --tail=100 app
docker compose -f infra/prod/docker-compose.prod.yml logs --tail=100 nginx
free -h
docker stats --no-stream
dmesg -T | grep -i -E "oom|killed process"
curl -I https://api.<your-domain>/api/v1/health
```

Expected state:

- `app`, `nginx`, `postgres`, `mongodb` are `Up`
- `app` healthcheck passes
- `nginx` can proxy to `app`
- no unexpected OOM messages
- only `80/443` are publicly reachable

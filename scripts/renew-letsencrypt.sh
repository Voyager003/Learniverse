#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/prod/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/infra/prod/.env.prod"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

cd "$ROOT_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot renew \
  --webroot \
  -w /var/www/certbot \
  --non-interactive

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T nginx nginx -s reload

echo "Certificate renewal check completed"

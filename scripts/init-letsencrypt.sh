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

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${API_DOMAIN:-}" ]]; then
  echo "API_DOMAIN must be set in $ENV_FILE"
  exit 1
fi

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "LETSENCRYPT_EMAIL must be set in $ENV_FILE"
  exit 1
fi

mkdir -p "$ROOT_DIR/infra/prod/certbot/conf" "$ROOT_DIR/infra/prod/certbot/www"

cd "$ROOT_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$API_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx

echo "Certificate issued for: $API_DOMAIN"

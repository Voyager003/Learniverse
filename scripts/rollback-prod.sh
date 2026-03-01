#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <previous-image-tag>"
  exit 1
fi

PREVIOUS_TAG="$1"
ROOT_DIR="/opt/learniverse"
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
export IMAGE_TAG="$PREVIOUS_TAG"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull app
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d app

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T app \
  node -e "fetch('http://localhost:3000/api/v1/health').then((res)=>{if(!res.ok)process.exit(1)}).catch(()=>process.exit(1))"

echo "Rollback successful to tag: $PREVIOUS_TAG"

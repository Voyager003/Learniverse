#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <image-tag>"
  exit 1
fi

IMAGE_TAG="$1"
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
export IMAGE_TAG

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull app
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres mongodb
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm app npm run migration:run:prod
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d app

MAX_RETRIES=30
SLEEP_SECONDS=2
ATTEMPT=1

until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T app \
  node -e "fetch('http://localhost:3000/api/v1/health').then((res)=>{if(!res.ok)process.exit(1)}).catch(()=>process.exit(1))"; do
  if [[ $ATTEMPT -ge $MAX_RETRIES ]]; then
    echo "Health check failed after $MAX_RETRIES attempts"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=200 app
    exit 1
  fi

  echo "Health check retry $ATTEMPT/$MAX_RETRIES in ${SLEEP_SECONDS}s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Deployment successful with tag: $IMAGE_TAG"

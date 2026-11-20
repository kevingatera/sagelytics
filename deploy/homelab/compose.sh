#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec docker compose --project-directory "$PWD" -p sagelytics-staging \
  --env-file .env.staging -f src/docker-compose.yml -f compose.override.yml "$@"

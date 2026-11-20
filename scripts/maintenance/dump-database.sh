#!/bin/bash
set -euo pipefail

# Dumps the sagelytics database with pg_dump (PostgreSQL 16, run in Docker).
# Requires DATABASE_URL, e.g. postgresql://USER:PASSWORD@HOST:PORT/sagelytics.
# Export it in your shell (or source .env) before running. Never commit the value.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set. Expected postgresql://USER:PASSWORD@HOST:PORT/DBNAME" >&2
  exit 1
fi
export DATABASE_URL

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sagelytics_backup_$DATE.sql"
export BACKUP_FILE

echo "Creating database dump to $BACKUP_FILE..."

# DATABASE_URL and BACKUP_FILE are passed by name so the password stays out of argv.
docker run --rm \
  --network=host \
  -e DATABASE_URL \
  -e BACKUP_FILE \
  -v "$(pwd):/backup" \
  postgres:16 \
  sh -c 'pg_dump --dbname="$DATABASE_URL" --format=plain --file="/backup/$BACKUP_FILE"'

echo "Database dump completed successfully!"
echo "Backup saved to: $BACKUP_FILE"

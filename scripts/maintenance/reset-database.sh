#!/bin/bash
set -euo pipefail

# Drops and recreates the sagelytics database, then pushes the schema.
# Requires DATABASE_URL, e.g. postgresql://USER:PASSWORD@HOST:PORT/sagelytics.
# The URL must name the database as its path and carry no query string.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set. Expected postgresql://USER:PASSWORD@HOST:PORT/DBNAME" >&2
  exit 1
fi

DB_NAME="${DATABASE_URL##*/}"
if ! [[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Error: could not read a plain database name from DATABASE_URL (query strings are not supported)" >&2
  exit 1
fi

# Same server and credentials, connected to the maintenance database.
export ADMIN_URL="${DATABASE_URL%/*}/postgres"

# Runs one SQL statement through Docker PostgreSQL 16. ADMIN_URL is passed by name.
run_admin_sql() {
  docker run --rm \
    --network=host \
    -e ADMIN_URL \
    postgres:16 \
    sh -c 'psql "$ADMIN_URL" -c "$1"' sh "$1"
}

echo "Terminating connections to database $DB_NAME..."
run_admin_sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

echo "Dropping database $DB_NAME..."
run_admin_sql "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating database $DB_NAME..."
run_admin_sql "CREATE DATABASE $DB_NAME;"

echo "Pushing schema with pnpm db:push..."
pnpm db:push

echo "Database reset completed!"

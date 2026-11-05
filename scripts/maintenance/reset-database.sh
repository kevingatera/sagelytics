#!/bin/bash

# Database connection details
DB_USER="postgres"
DB_PASSWORD="58llPkDM2pQyEdDz"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="sagelytics"

echo "Terminating connections to database $DB_NAME..."

# Terminate active connections to the database
docker run --rm \
  --network=host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16 \
  psql \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --dbname=postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

echo "Dropping database $DB_NAME..."

# Drop database using Docker PostgreSQL 16
docker run --rm \
  --network=host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16 \
  psql \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --dbname=postgres \
    -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating database $DB_NAME..."

# Create database
docker run --rm \
  --network=host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16 \
  psql \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --dbname=postgres \
    -c "CREATE DATABASE $DB_NAME;"

echo "Pushing schema with pnpm db:push..."
pnpm db:push

echo "Database reset completed!" 
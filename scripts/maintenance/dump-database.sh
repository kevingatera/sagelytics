#!/bin/bash

# Get the current date for the backup filename
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sagelytics_backup_$DATE.sql"

# Database connection details
DB_USER="postgres"
DB_PASSWORD="58llPkDM2pQyEdDz"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="sagelytics"

echo "Creating database dump to $BACKUP_FILE..."

# Use Docker to run pg_dump with PostgreSQL 16 to match the server version
docker run --rm \
  --network=host \
  -v "$(pwd):/backup" \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16 \
  pg_dump \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --dbname=$DB_NAME \
    --format=plain \
    --file=/backup/$BACKUP_FILE

# Check if the dump was successful
if [ $? -eq 0 ]; then
  echo "Database dump completed successfully!"
  echo "Backup saved to: $BACKUP_FILE"
else
  echo "Error: Database dump failed."
  exit 1
fi 
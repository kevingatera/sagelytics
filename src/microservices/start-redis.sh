#!/usr/bin/env bash
# Use this script to start a docker container for a local Redis instance

REDIS_CONTAINER_NAME="sagelytics-redis"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

if [ "$(docker ps -q -f name=$REDIS_CONTAINER_NAME)" ]; then
  echo "Redis container '$REDIS_CONTAINER_NAME' already running"
  exit 0
fi

if [ "$(docker ps -q -a -f name=$REDIS_CONTAINER_NAME)" ]; then
  docker start "$REDIS_CONTAINER_NAME"
  echo "Existing Redis container '$REDIS_CONTAINER_NAME' started"
  exit 0
fi

# import env variables from .env
set -a
source .env

REDIS_PORT=$(echo "$REDIS_URL" | awk -F':' '{print $3}' | awk -F'/' '{print $1}')
REDIS_PORT=${REDIS_PORT:-6379}

docker run -d \
  --name $REDIS_CONTAINER_NAME \
  -p "$REDIS_PORT":6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes && echo "Redis container '$REDIS_CONTAINER_NAME' was successfully created" 
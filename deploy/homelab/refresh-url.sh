#!/bin/sh
set -eu
cd "$(dirname "$0")"

tunnel=$(./compose.sh ps -q tunnel)
if [ -z "$tunnel" ]; then
  echo 'Start the staging tunnel before refreshing its URL.' >&2
  exit 1
fi

url=
for attempt in $(seq 1 30); do
  started=$(docker inspect --format '{{.State.StartedAt}}' "$tunnel")
  url=$(docker logs --since "$started" "$tunnel" 2>&1 |
    grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1)
  if [ -n "$url" ]; then
    break
  fi
  sleep 2
done
if [ -z "$url" ]; then
  echo 'The staging tunnel did not report a URL. Check ./compose.sh logs tunnel.' >&2
  exit 1
fi

umask 077
tmp=$(mktemp .env.staging.XXXXXX)
trap 'rm -f "$tmp"' EXIT
awk '!/^(AUTH_URL|NEXTAUTH_URL)=/' .env.staging > "$tmp"
printf 'AUTH_URL=%s\nNEXTAUTH_URL=%s\n' "$url" "$url" >> "$tmp"
mv "$tmp" .env.staging

./compose.sh up -d --no-deps --wait --wait-timeout 90 web >&2
printf '%s\n' "$url"

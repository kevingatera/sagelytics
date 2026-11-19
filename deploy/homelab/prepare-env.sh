#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 3 ]]; then
  echo "Usage: $0 <local-sagelytics-checkout> <cliproxy-key-file> <bitwarden-item-id>" >&2
  exit 2
fi

checkout=$1
proxy_key=$(< "$2")
smtp_password=$(bw get password "$3") || exit 1
if [[ -z "$proxy_key" || -z "$smtp_password" ]]; then
  echo 'A required credential is empty.' >&2
  exit 1
fi

read_env_lines() {
  local file=$1 name
  shift
  for name in "$@"; do
    grep -m 1 -E "^${name}=.+" "$file" || {
      printf 'Missing %s in %s\n' "$name" "$file" >&2
      return 1
    }
  done
}

print_env_value() {
  local name=$1 value=$2
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    printf '%s must fit on one line.\n' "$name" >&2
    return 1
  fi
  value=${value//\\/\\\\}
  value=${value//\'/\\\'}
  printf "%s='%s'\n" "$name" "$value"
}

google=$(read_env_lines "$checkout/.env" AUTH_GOOGLE_CLIENT_ID AUTH_GOOGLE_CLIENT_SECRET)
free_tiers=$(read_env_lines "$checkout/src/microservices/.env" GROQ_API_KEY GEMINI_API_KEY)
auth_secret=$(openssl rand -base64 32)
pg_password=$(openssl rand -hex 24)
redis_password=$(openssl rand -hex 24)

printf '%s\n' "$google" "$free_tiers"
print_env_value AUTH_SECRET "$auth_secret"
print_env_value POSTGRES_PASSWORD "$pg_password"
print_env_value DATABASE_URL "postgresql://sagelytics:$pg_password@postgres:5432/sagelytics"
print_env_value REDIS_PASSWORD "$redis_password"
print_env_value REDIS_URL "redis://default:$redis_password@redis:6379"
print_env_value AUTH_URL http://127.0.0.1:3110
print_env_value NEXTAUTH_URL http://127.0.0.1:3110
print_env_value OPENAI_API_KEY "$proxy_key"
print_env_value OPENROUTER_API_KEY "$proxy_key"
print_env_value SMTP_HOST smtp.purelymail.com
print_env_value SMTP_PORT 465
print_env_value SMTP_SECURE true
print_env_value SMTP_USER sagelytics@deployitwith.me
print_env_value EMAIL_FROM 'Sagelytics <sagelytics@deployitwith.me>'
print_env_value SMTP_PASSWORD "$smtp_password"

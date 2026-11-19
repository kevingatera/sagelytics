#!/bin/bash
set -euo pipefail

# Checks that drizzle/ takes both a fresh database and a database built from main's schema to
# exactly src/server/db/schema.ts, without prompts, and that a second migrate changes nothing.
#
# Uses DATABASE_URL only for its server and credentials: it creates and drops its own
# databases next to the one named there. The URL is never printed.
#
# Optional:
#   MAIN_REF=origin/main            git ref whose schema.ts stands for existing installs
#   MIGRATE_IMAGE=sagelytics-migrate  migrate the main-schema database by running this image's
#                                   default command (docker run --network host) instead of
#                                   the local drizzle-kit
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set. Expected postgresql://USER:PASSWORD@HOST:PORT/DBNAME" >&2
  exit 1
fi
case "$DATABASE_URL" in
  *\?*) echo "Error: DATABASE_URL query strings are not supported" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
MAIN_REF="${MAIN_REF:-origin/main}"
MIGRATE_IMAGE="${MIGRATE_IMAGE:-}"
EXPECTED_MIGRATIONS=$(node -e 'console.log(require("./drizzle/meta/_journal.json").entries.length)')
KIT="$ROOT/node_modules/.bin/drizzle-kit"
[ -x "$KIT" ] || { echo "Error: run pnpm install first" >&2; exit 1; }

export VERIFY_SECRET="$DATABASE_URL"
SERVER_URL="${DATABASE_URL%/*}"
SUFFIX="$$_$(date +%s)"
FRESH_DB="verify_mig_fresh_${SUFFIX}"
MAIN_DB="verify_mig_main_${SUFFIX}"
PUSH_DB="verify_mig_push_${SUFFIX}"
TMP_DIR="$(mktemp -d "$ROOT/.verify-migrations.XXXXXX")"
FAILURES=0

# Replaces the connection string in any output with ***.
redact() {
  awk '{ s = ENVIRON["VERIFY_SECRET"]; while (s != "" && (i = index($0, s)) > 0) $0 = substr($0, 1, i - 1) "***" substr($0, i + length(s)); print }'
}

psql_on() {
  local db="$1"; shift
  if command -v psql >/dev/null 2>&1; then
    psql "$SERVER_URL/$db" -X -v ON_ERROR_STOP=1 -q "$@"
  else
    PSQL_URL="$SERVER_URL/$db" docker run --rm -i --network host -e PSQL_URL postgres:16 \
      sh -c 'exec psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -q "$@"' sh "$@"
  fi
}

query() { psql_on "$1" -tA -c "$2" 2>&1 | redact; }

kit() {
  local db="$1"; shift
  DATABASE_URL="$SERVER_URL/$db" SKIP_ENV_VALIDATION=1 timeout 300 "$KIT" "$@" </dev/null 2>&1 | redact
}

migrate() {
  local db="$1"
  if [ -n "${2:-}" ]; then
    DATABASE_URL="$SERVER_URL/$db" docker run --rm --network host \
      -e DATABASE_URL -e SKIP_ENV_VALIDATION=1 "$2" </dev/null 2>&1 | redact
  else
    kit "$db" migrate --config drizzle.config.ts
  fi
}

cleanup() {
  for db in "$FRESH_DB" "$MAIN_DB" "$PUSH_DB"; do
    psql_on postgres -c "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)" >/dev/null 2>&1 || true
  done
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ok   $label"
  else
    echo "  FAIL $label: expected [$expected], got [$actual]"
    FAILURES=$((FAILURES + 1))
  fi
}

expect_no_changes() {
  local db="$1" out
  out="$(kit "$db" push --config drizzle.config.ts || true)"
  if grep -q 'No changes detected' <<<"$out"; then
    echo "  ok   push reports no changes"
  else
    echo "  FAIL push reports changes or prompted:"
    sed 's/^/       /' <<<"$out" | tail -20
    FAILURES=$((FAILURES + 1))
  fi
}

expect_migrate_ok() {
  local out status
  set +e
  out="$(migrate "$@")"
  status=$?
  set -e
  if [ $status -eq 0 ] && ! grep -qiE 'error|exception' <<<"$out"; then
    echo "  ok   migrate succeeded"
  else
    echo "  FAIL migrate (exit $status):"
    sed 's/^/       /' <<<"$out" | tail -20
    FAILURES=$((FAILURES + 1))
  fi
}

# Fingerprint of every sg_* table's rows, to show a second migrate changes nothing.
fingerprint() {
  query "$1" "SELECT md5(string_agg(t || ':' || h, ',' ORDER BY t)) FROM (
    SELECT c.relname AS t,
      (xpath('/row/h/text()', query_to_xml(format('SELECT md5(coalesce(string_agg(x::text, %L ORDER BY x::text), %L)) AS h FROM %I.%I x', ',', '', n.nspname, c.relname), false, true, '')))[1]::text AS h
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname IN ('public', 'sg_archive', 'drizzle')
  ) s"
}

echo "== Case 1: fresh database"
psql_on postgres -c "CREATE DATABASE \"$FRESH_DB\"" 2>&1 | redact
expect_migrate_ok "$FRESH_DB"
expect_no_changes "$FRESH_DB"
check "migrations recorded" "$EXPECTED_MIGRATIONS" "$(query "$FRESH_DB" 'SELECT count(*) FROM drizzle.__drizzle_migrations')"
check "sg_post dropped (it was empty)" "" "$(query "$FRESH_DB" "SELECT to_regclass('public.sg_post')")"
before="$(fingerprint "$FRESH_DB")"
expect_migrate_ok "$FRESH_DB"
check "second migrate changes nothing" "$before" "$(fingerprint "$FRESH_DB")"

echo "== Case 2: database built from $MAIN_REF's schema"
psql_on postgres -c "CREATE DATABASE \"$MAIN_DB\"" 2>&1 | redact
git show "$MAIN_REF:src/server/db/schema.ts" >"$TMP_DIR/schema.ts"
REL_TMP="${TMP_DIR#"$ROOT"/}"
cat >"$TMP_DIR/drizzle.config.ts" <<EOF
export default {
  schema: './$REL_TMP/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL as string },
  tablesFilter: ['sg_*'],
};
EOF
kit "$MAIN_DB" push --force --config "$TMP_DIR/drizzle.config.ts" | tail -1
psql_on "$MAIN_DB" <<'SQL' 2>&1 | redact
INSERT INTO sg_user (id, email, name) VALUES
  ('u1', 'u1@example.test', 'Shared One'),
  ('u2', 'u2@example.test', 'Shared Two'),
  ('u3', 'u3@example.test', 'Solo');
UPDATE sg_user SET email_verified = NULL WHERE id = 'u3';
INSERT INTO sg_verification_token (identifier, token, expires)
  VALUES ('u1@example.test', 'legacy-reset-token', now() + interval '1 hour');
INSERT INTO sg_user_onboarding (id, user_id, company_domain, business_type, completed)
  VALUES ('o1', 'u1', 'one.example', 'ecommerce', true);
INSERT INTO sg_post (name, created_by) VALUES ('legacy post', 'u1');
INSERT INTO sg_competitors (id, domain, metadata) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'shared.example', '{
    "matchScore": 0.9, "matchReasons": ["u1 secret reason"], "suggestedApproach": "undercut u1",
    "dataGaps": ["gap"], "lastAnalyzed": "2026-01-01T00:00:00.000Z",
    "platforms": [{"platform": "web", "url": "https://shared.example", "metrics": {"lastUpdated": "2026-01-01T00:00:00.000Z"}}],
    "products": [{"name": "Room", "url": "https://shared.example/room", "price": 120, "currency": "USD", "platform": "unknown",
      "lastUpdated": "2026-01-01T00:00:00.000Z",
      "matchedProducts": [{"name": "u1 private product", "url": null, "matchScore": 0.8, "priceDiff": 5}]},
      {"name": "Unpriced", "url": "", "price": 0, "currency": "USD", "platform": "unknown", "lastUpdated": "2026-01-01T00:00:00.000Z", "matchedProducts": []}]
  }'),
  ('00000000-0000-0000-0000-00000000000b', 'solo.example', '{
    "matchScore": 0.7, "matchReasons": ["u3 reason"], "suggestedApproach": "bundle",
    "dataGaps": [], "lastAnalyzed": "2026-02-01T00:00:00.000Z", "platforms": [],
    "products": [{"name": "Tour", "url": "https://solo.example/tour", "price": 50, "currency": "USD", "platform": "unknown",
      "lastUpdated": "2026-02-01T00:00:00.000Z",
      "matchedProducts": [{"name": "u3 product", "url": "https://u3.example/p", "matchScore": 0.6, "priceDiff": -2}]}]
  }'),
  ('00000000-0000-0000-0000-00000000000c', 'orphan.example', '{
    "matchScore": 0.1, "matchReasons": ["nobody"], "suggestedApproach": "", "dataGaps": [],
    "lastAnalyzed": "2026-03-01T00:00:00.000Z", "platforms": [], "products": []
  }');
INSERT INTO sg_user_competitors (id, user_id, competitor_id) VALUES
  ('l1', 'u1', '00000000-0000-0000-0000-00000000000a'),
  ('l2', 'u2', '00000000-0000-0000-0000-00000000000a'),
  ('l3', 'u3', '00000000-0000-0000-0000-00000000000b');
SQL
if [ -n "$MIGRATE_IMAGE" ]; then
  echo "  (migrating with image $MIGRATE_IMAGE)"
fi
expect_migrate_ok "$MAIN_DB" "$MIGRATE_IMAGE"
expect_no_changes "$MAIN_DB"
check "users preserved" "3" "$(query "$MAIN_DB" 'SELECT count(*) FROM sg_user')"
check "links preserved" "3" "$(query "$MAIN_DB" 'SELECT count(*) FROM sg_user_competitors')"
check "onboarding preserved" "one.example" "$(query "$MAIN_DB" "SELECT company_domain FROM sg_user_onboarding WHERE id = 'o1'")"
check "competitors preserved" "3" "$(query "$MAIN_DB" 'SELECT count(*) FROM sg_competitors')"
check "new tables exist" "4" "$(query "$MAIN_DB" "SELECT count(*) FROM (VALUES ('sg_monitoring_tasks'), ('sg_user_products'), ('sg_billing_subscription'), ('sg_user_competitor_analysis')) v(t) WHERE to_regclass('public.' || t) IS NOT NULL")"
check "shared metadata has no private keys" "0" "$(query "$MAIN_DB" "SELECT count(*) FROM sg_competitors WHERE metadata ?| ARRAY['matchScore', 'matchReasons', 'suggestedApproach', 'dataGaps'] OR metadata::text LIKE '%matchedProducts%'")"
check "shared metadata keeps public facts" "web|Room|120|null" "$(query "$MAIN_DB" "SELECT metadata->'platforms'->0->>'platform' || '|' || (metadata->'products'->0->>'name') || '|' || (metadata->'products'->0->>'price') || '|' || (metadata->'products'->1->'price')::text FROM sg_competitors WHERE domain = 'shared.example'")"
check "only the single-link user got a private row" "u3:solo.example" "$(query "$MAIN_DB" "SELECT string_agg(a.user_id || ':' || c.domain, ',') FROM sg_user_competitor_analysis a JOIN sg_competitors c ON c.id = a.competitor_id")"
check "private row carries that user's analysis" "u3 reason|u3 product|https://solo.example/tour" "$(query "$MAIN_DB" "SELECT (metadata->'matchReasons'->>0) || '|' || (metadata->'productMatches'->0->'matchedProducts'->0->>'name') || '|' || (metadata->'productMatches'->0->>'productKey') FROM sg_user_competitor_analysis WHERE user_id = 'u3'")"
check "existing users stay verified" "0" "$(query "$MAIN_DB" 'SELECT count(*) FROM sg_user WHERE email_verified IS NULL')"
check "legacy reset tokens removed" "0" "$(query "$MAIN_DB" 'SELECT count(*) FROM sg_verification_token')"
check "new users start unverified" "t|0" "$(query "$MAIN_DB" "INSERT INTO sg_user (id, email) VALUES ('u4', 'u4@example.test') RETURNING (email_verified IS NULL)::text || '|' || session_version" | sed 's/^true/t/')"
query "$MAIN_DB" "DELETE FROM sg_user WHERE id = 'u4'" >/dev/null
check "sg_post with rows archived, not dropped" "|1" "$(query "$MAIN_DB" "SELECT coalesce(to_regclass('public.sg_post')::text, '') || '|' || (SELECT count(*) FROM sg_archive.sg_post)")"
before="$(fingerprint "$MAIN_DB")"
expect_migrate_ok "$MAIN_DB"
check "second migrate changes nothing" "$before" "$(fingerprint "$MAIN_DB")"
expect_no_changes "$MAIN_DB"

echo "== Case 3: database built by db:push from the current schema (dev and CI)"
psql_on postgres -c "CREATE DATABASE \"$PUSH_DB\"" 2>&1 | redact
kit "$PUSH_DB" push --force --config drizzle.config.ts | tail -1
expect_migrate_ok "$PUSH_DB"
expect_no_changes "$PUSH_DB"
check "migrations recorded" "$EXPECTED_MIGRATIONS" "$(query "$PUSH_DB" 'SELECT count(*) FROM drizzle.__drizzle_migrations')"

echo "== Journal: generate with no schema changes"
# Generate into a copy of drizzle/ so a failing check leaves no stray migration behind.
cp -r drizzle "$TMP_DIR/drizzle"
cat >"$TMP_DIR/generate.config.ts" <<EOF
export default {
  schema: './src/server/db/schema.ts',
  out: './$REL_TMP/drizzle',
  dialect: 'postgresql',
  tablesFilter: ['sg_*'],
};
EOF
out="$(kit "$FRESH_DB" generate --config "$TMP_DIR/generate.config.ts" || true)"
if grep -q 'No schema changes' <<<"$out"; then
  echo "  ok   generate reports no schema changes"
else
  echo "  FAIL generate produced a migration:"
  sed 's/^/       /' <<<"$out" | tail -10
  FAILURES=$((FAILURES + 1))
fi

if [ "$FAILURES" -ne 0 ]; then
  echo "$FAILURES check(s) failed" >&2
  exit 1
fi
echo "All migration checks passed"

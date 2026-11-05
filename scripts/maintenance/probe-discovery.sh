#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  scripts/maintenance/probe-discovery.sh --domain <url> [options]

Options:
  --domain <url>            Target domain/URL to analyze (required)
  --catalog-url <url>       Catalog URL (default: <domain>/stay/)
  --business-type <type>    Business type hint (default: other)
  --known <csv>             Known competitors, comma-separated
  --user-id <id>            Probe user id (default: probe-user)
  --host <host>             Microservice host (default: MICROSERVICE_HOST or localhost)
  --port <port>             Microservice port (default: MICROSERVICE_PORT or 3001)
  --timeout-seconds <sec>   End-to-end timeout for the probe (default: 240)
  --raw                     Print full raw microservice response
  --help                    Show this message

Examples:
  scripts/maintenance/probe-discovery.sh \
    --domain "https://lebambougorillalodge.com/" \
    --business-type other \
    --known "https://example-probe.invalid"

  pnpm maintenance:probe-discovery -- --domain "https://lebambougorillalodge.com/"
EOF
}

DOMAIN=""
CATALOG_URL=""
BUSINESS_TYPE="other"
KNOWN_COMPETITORS=""
USER_ID="probe-user"
HOST="${MICROSERVICE_HOST:-localhost}"
PORT="${MICROSERVICE_PORT:-3001}"
TIMEOUT_SECONDS="240"
RAW_OUTPUT="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --catalog-url)
      CATALOG_URL="${2:-}"
      shift 2
      ;;
    --business-type)
      BUSINESS_TYPE="${2:-}"
      shift 2
      ;;
    --known)
      KNOWN_COMPETITORS="${2:-}"
      shift 2
      ;;
    --user-id)
      USER_ID="${2:-}"
      shift 2
      ;;
    --host)
      HOST="${2:-}"
      shift 2
      ;;
    --port)
      PORT="${2:-}"
      shift 2
      ;;
    --timeout-seconds)
      TIMEOUT_SECONDS="${2:-}"
      shift 2
      ;;
    --raw)
      RAW_OUTPUT="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${DOMAIN}" ]]; then
  echo "Error: --domain is required."
  usage
  exit 1
fi

if [[ -z "${CATALOG_URL}" ]]; then
  CATALOG_URL="${DOMAIN%/}/stay/"
fi

if ! [[ "${TIMEOUT_SECONDS}" =~ ^[0-9]+$ ]] || [[ "${TIMEOUT_SECONDS}" -le 0 ]]; then
  echo "Error: --timeout-seconds must be a positive integer."
  exit 1
fi

export PROBE_DOMAIN="${DOMAIN}"
export PROBE_CATALOG_URL="${CATALOG_URL}"
export PROBE_BUSINESS_TYPE="${BUSINESS_TYPE}"
export PROBE_KNOWN_COMPETITORS="${KNOWN_COMPETITORS}"
export PROBE_USER_ID="${USER_ID}"
export PROBE_HOST="${HOST}"
export PROBE_PORT="${PORT}"
export PROBE_TIMEOUT_SECONDS="${TIMEOUT_SECONDS}"
export PROBE_RAW_OUTPUT="${RAW_OUTPUT}"

echo "Running discovery probe..."
echo "  domain: ${PROBE_DOMAIN}"
echo "  catalog: ${PROBE_CATALOG_URL}"
echo "  businessType: ${PROBE_BUSINESS_TYPE}"
echo "  knownCompetitors: ${PROBE_KNOWN_COMPETITORS:-<none>}"
echo "  microservice: ${PROBE_HOST}:${PROBE_PORT}"
echo "  timeoutSeconds: ${PROBE_TIMEOUT_SECONDS}"

cd "${ROOT_DIR}"

node --input-type=module <<'NODE'
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

const host = process.env.PROBE_HOST || 'localhost';
const port = Number(process.env.PROBE_PORT || '3001');
const timeoutSeconds = Number(process.env.PROBE_TIMEOUT_SECONDS || '240');
const timeoutMs = timeoutSeconds * 1000;
const rawOutput = process.env.PROBE_RAW_OUTPUT === 'true';

const knownCompetitors = (process.env.PROBE_KNOWN_COMPETITORS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const payload = {
  domain: process.env.PROBE_DOMAIN,
  userId: process.env.PROBE_USER_ID || 'probe-user',
  businessType: process.env.PROBE_BUSINESS_TYPE || 'other',
  knownCompetitors,
  productCatalogUrl: process.env.PROBE_CATALOG_URL,
};

const client = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { host, port },
});

const start = Date.now();
let timeoutHandle;

try {
  const result = await Promise.race([
    firstValueFrom(client.send('discover_competitors', payload)),
    new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            `Probe timed out after ${timeoutSeconds} seconds while waiting for discover_competitors`,
          ),
        );
      }, timeoutMs);
    }),
  ]);
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }

  const elapsedMs = Date.now() - start;
  const competitors = Array.isArray(result?.competitors)
    ? result.competitors
    : [];
  const userProducts = Array.isArray(result?.userProducts)
    ? result.userProducts
    : [];

  const summary = {
    ok: true,
    durationMs: elapsedMs,
    competitors: competitors.length,
    userProducts: userProducts.length,
    domains: competitors.map((c) => c?.domain).filter(Boolean).slice(0, 8),
    stats: result?.stats ?? null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (rawOutput) {
    console.log('\nRaw response:');
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }
  const elapsedMs = Date.now() - start;
  console.error(
    JSON.stringify(
      {
        ok: false,
        durationMs: elapsedMs,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  client.close();
}
NODE

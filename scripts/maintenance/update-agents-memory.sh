#!/usr/bin/env bash
set -euo pipefail

# Appends a memory note to AGENTS.md Session Notes.
# Usage:
#   scripts/maintenance/update-agents-memory.sh \
#     "What changed" \
#     "What broke / risk found" \
#     "User preference learned" \
#     "Follow-up actions"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENTS_FILE="${ROOT_DIR}/AGENTS.md"

if [[ ! -f "${AGENTS_FILE}" ]]; then
  echo "AGENTS.md not found at ${AGENTS_FILE}"
  exit 1
fi

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 \"What changed\" \"What broke / risk found\" \"User preference learned\" \"Follow-up actions\""
  exit 1
fi

what_changed="$1"
what_broke="$2"
user_pref="$3"
follow_up="$4"

if ! rg -q '^## Session Notes$' "${AGENTS_FILE}"; then
  {
    echo
    echo "## Session Notes"
  } >> "${AGENTS_FILE}"
fi

{
  echo "- Entry:"
  echo "- What changed: ${what_changed}"
  echo "- What broke / risk found: ${what_broke}"
  echo "- User preference learned: ${user_pref}"
  echo "- Follow-up actions: ${follow_up}"
} >> "${AGENTS_FILE}"

echo "Appended session note to AGENTS.md."

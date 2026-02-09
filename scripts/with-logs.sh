#!/usr/bin/env bash
set -euo pipefail

# with-logs.sh <app_name> <abs_log_dir> <command>
# - Rotates logs per start using timestamped filenames
# - Preserves color in console by running the command under a pseudo-TTY when available
# - Writes the same colored output to the log file via tee

APP_NAME=${1:-app}
LOG_DIR=${2:-}
CMD=${3:-}

if [[ -z "${LOG_DIR}" || -z "${CMD}" ]]; then
  echo "Usage: $(basename "$0") <app_name> <abs_log_dir> <command>"
  exit 1
fi

# Ensure absolute log directory exists
mkdir -p "${LOG_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/${APP_NAME}-${TIMESTAMP}.log"

# Header for easier parsing when tailing concatenated logs
echo "===== ${APP_NAME} start ${TIMESTAMP} pid $$ =====" | tee -a "${LOG_FILE}" >/dev/null

# Prefer pseudo-TTY to keep colors enabled regardless of piping
export FORCE_COLOR=3

run_with_pty() {
  # util-linux 'script' provides a PTY; write typescript to /dev/null
  # -q: quiet, -f: flush, -e: return command exit code, -c: command
  script -qfec "$CMD" /dev/null
}

run_plain() {
  # Fallback: still force colors and line-buffer output
  stdbuf -oL -eL bash -lc "$CMD"
}

strip_ansi() {
  # Use sed with a simpler, more portable regex pattern
  sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' 2>/dev/null || cat
}

if command -v script >/dev/null 2>&1; then
  # Keep colors on console; strip ANSI when writing to the log file
  run_with_pty | tee >(strip_ansi >> "${LOG_FILE}")
else
  run_plain | tee >(strip_ansi >> "${LOG_FILE}")
fi



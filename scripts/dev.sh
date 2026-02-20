#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/dev.sh frontend   # start frontend only
  ./scripts/dev.sh backend    # start backend only
USAGE
}

MODE="${1:-}" 

case "$MODE" in
  frontend)
    echo "[dev.sh] Starting frontend on http://localhost:3000"
    echo "[dev.sh] Browser auto-open is disabled. Open the URL manually."
    npm --prefix frontend start
    ;;
  backend)
    echo "[dev.sh] Starting backend on http://localhost:5050"
    echo "[dev.sh] Health check: http://localhost:5050/health"
    npm --prefix backend start
    ;;
  *)
    usage
    exit 1
    ;;
esac

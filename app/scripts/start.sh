#!/usr/bin/env bash
# WebAI OS — production server launcher.
#
# Expects `dist/` to exist (run scripts/build.sh first).
# Honors PORT env (default 3000) and HOST (default 0.0.0.0 — LAN-reachable).

set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

if [ ! -f dist/_boot.js ]; then
  echo "dist/_boot.js not found. Run scripts/build.sh first." >&2
  exit 1
fi

# Free port if a stale instance is holding it.
stale=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$stale" ]; then
  echo "Freeing port $PORT (was held by pid $stale)"
  echo "$stale" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "Starting WebAI OS on $HOST:$PORT (NODE_ENV=production)"
exec env NODE_ENV=production PORT="$PORT" HOST="$HOST" node dist/_boot.js

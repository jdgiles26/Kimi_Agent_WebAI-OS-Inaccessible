#!/usr/bin/env bash
# WebAI OS — production build with full gate.
#
# Runs typecheck + lint + tests, then `vite build` + esbuild on the API,
# and finally prints the bundle sizes.
#
# Pass --quick to skip lint + tests (typecheck still runs — it's load-bearing).

set -euo pipefail

cd "$(dirname "$0")/.."

QUICK=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    *) echo "Unknown flag: $arg"; exit 2 ;;
  esac
done

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }

bold "==> Clean dist/"
rm -rf dist
green "    OK"

bold "==> Typecheck"
npm run check
green "    OK"

if [ "$QUICK" -eq 0 ]; then
  bold "==> Lint"
  npm run lint
  green "    OK"

  bold "==> Tests"
  npm test --silent
  green "    OK"
fi

bold "==> Build (Vite + esbuild)"
npm run build
green "    OK"

bold "==> Bundle sizes"
if [ -d dist/public ]; then
  ls -lah dist/public | grep -E "\.(js|wasm|css|html)$" | awk '{printf "    %-12s %s\n", $5, $NF}'
fi
if [ -f dist/boot.js ]; then
  printf "    %-12s dist/boot.js (server)\n" "$(ls -lah dist/boot.js | awk '{print $5}')"
fi
echo
green "Build complete. Start with: npm start  (or: scripts/start.sh)"

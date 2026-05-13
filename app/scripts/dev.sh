#!/usr/bin/env bash
# WebAI OS — first-run + dev launcher.
#
# Idempotent. Run this any time. It will:
#   1. Verify Node + npm versions
#   2. Install deps if node_modules is missing or package-lock changed
#   3. On macOS: detect if the Node binary is blocked by the Application Firewall
#      (the symptom is iPhone/LAN clients fail to connect; localhost still works).
#      Offers to unblock it via sudo if the user opts in.
#   4. Free ports 3000 / 3001 if a stale dev server still holds them
#   5. Run typecheck + tests (fast)
#   6. Start `vite` in the foreground
#
# Pass --skip-checks to bypass typecheck/tests for a hot loop.
# Pass --no-firewall-fix to skip the macOS firewall handling.

set -euo pipefail

cd "$(dirname "$0")/.."

SKIP_CHECKS=0
FIREWALL_FIX=1
for arg in "$@"; do
  case "$arg" in
    --skip-checks)    SKIP_CHECKS=1 ;;
    --no-firewall-fix) FIREWALL_FIX=0 ;;
    *) echo "Unknown flag: $arg"; exit 2 ;;
  esac
done

bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*" >&2; }

# ---------------------------------------------------------------------------
# 1. Node version
# ---------------------------------------------------------------------------
bold "==> Node check"
if ! command -v node >/dev/null; then
  red "node not found. Install Node 20+ (https://nodejs.org/) and re-run."
  exit 1
fi
node_major=$(node -p "process.versions.node.split('.')[0]")
if [ "$node_major" -lt 20 ]; then
  red "Node $node_major detected. This project needs Node 20+."
  exit 1
fi
green "    Node $(node -v) at $(command -v node)"

# ---------------------------------------------------------------------------
# 2. Install
# ---------------------------------------------------------------------------
bold "==> Install"
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm install
else
  green "    node_modules up to date"
fi

# ---------------------------------------------------------------------------
# 3. macOS firewall (only on Darwin, only if state=2 "block all non-essential")
# ---------------------------------------------------------------------------
if [ "$FIREWALL_FIX" -eq 1 ] && [ "$(uname)" = "Darwin" ]; then
  bold "==> macOS firewall"
  fw_state=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null | grep -oE 'State = [0-9]+' | awk '{print $3}' || echo "0")
  if [ "$fw_state" = "2" ] || [ "$fw_state" = "1" ]; then
    node_path=$(command -v node)
    blocked=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getappblocked "$node_path" 2>/dev/null | grep -c "blocked" || true)
    if [ "$blocked" -gt 0 ]; then
      yellow "    Firewall is blocking $node_path."
      yellow "    iPhone/LAN clients will see 'Empty reply from server' (localhost still works)."
      printf "    Unblock now? [y/N] "
      read -r ans
      if [ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ]; then
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$node_path"
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$node_path"
        green "    Node unblocked."
      else
        yellow "    Skipped. Remote Access app will surface the warning if you hit it."
      fi
    else
      green "    Node binary is permitted."
    fi
  else
    green "    Firewall not blocking inbound connections."
  fi
fi

# ---------------------------------------------------------------------------
# 4. Free stale dev-server ports
# ---------------------------------------------------------------------------
bold "==> Port check"
stale_pids=$(lsof -ti tcp:3000,tcp:3001 2>/dev/null || true)
if [ -n "$stale_pids" ]; then
  yellow "    Killing stale processes on 3000/3001: $stale_pids"
  echo "$stale_pids" | xargs kill -9 2>/dev/null || true
  sleep 1
else
  green "    Ports 3000/3001 clear"
fi

# ---------------------------------------------------------------------------
# 5. Typecheck + tests
# ---------------------------------------------------------------------------
if [ "$SKIP_CHECKS" -eq 0 ]; then
  bold "==> Typecheck"
  npm run check
  green "    OK"

  bold "==> Tests"
  npm test --silent
  green "    OK"
else
  yellow "==> Skipping typecheck + tests (--skip-checks)"
fi

# ---------------------------------------------------------------------------
# 6. Start dev server
# ---------------------------------------------------------------------------
bold "==> Starting Vite dev server"
echo "    Local:   http://localhost:3000/"
echo "    Network: see Settings → Remote Access for QR + LAN URL"
echo
exec npm run dev

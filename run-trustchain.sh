#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-trustchain.sh  — Launch the full TrustChain stack on macOS
#
# Usage:
#   ./run-trustchain.sh              # start all core services
#   ./run-trustchain.sh --fl         # also start Federated Learning server
#   ./run-trustchain.sh --skip-deploy # skip contract re-deployment
#   ./run-trustchain.sh --fl --skip-deploy
#
# Services started:
#   1. Hardhat local blockchain   → http://localhost:8545
#   2. Smart-contract deployment  (waits for Hardhat to be ready)
#   3. Go backend API             → http://localhost:8080
#   4. React / Vite frontend      → http://localhost:5173
#   5. Federated Learning server  (only with --fl)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Parse flags ───────────────────────────────────────────────────────────────
FL=false
SKIP_DEPLOY=false

for arg in "$@"; do
  case "$arg" in
    --fl)           FL=true ;;
    --skip-deploy)  SKIP_DEPLOY=true ;;
    -h|--help)
      sed -n '/^# Usage/,/^# ─/p' "$0" | head -n -1
      exit 0 ;;
    *)
      echo "Unknown flag: $arg  (use --fl or --skip-deploy)" >&2
      exit 1 ;;
  esac
done

# ── Resolve root dir (always the dir this script lives in) ───────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Resolve Python interpreter ───────────────────────────────────────────────
# Prefer the project venv (.venv311), then python3, then python
if [ -x "$ROOT/.venv311/bin/python" ]; then
  PYTHON="$ROOT/.venv311/bin/python"
elif command -v python3 &>/dev/null; then
  PYTHON="python3"
elif command -v python &>/dev/null; then
  PYTHON="python"
else
  PYTHON=""
fi

# ── Colours ───────────────────────────────────────────────────────────────────
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
MAGENTA='\033[1;35m'
GRAY='\033[0;90m'
RESET='\033[0m'

step()  { echo -e "\n${CYAN}  [$1] $2${RESET}"; }
ok()    { echo -e "${GREEN}      ✔  $1${RESET}"; }
warn()  { echo -e "${YELLOW}      ⚠  $1${RESET}"; }
err()   { echo -e "${RED}      ✖  $1${RESET}"; }

# ── Open a new macOS Terminal tab running a command ───────────────────────────
# Args: <tab-title> <working-directory> <shell-command>
open_tab() {
  local title="$1"
  local dir="$2"
  local cmd="$3"

  osascript \
    -e 'tell application "Terminal"' \
    -e '  activate' \
    -e "  tell application \"System Events\" to keystroke \"t\" using command down" \
    -e "  delay 0.3" \
    -e "  do script \"printf '\\\\033]0;${title}\\\\007'; cd '${dir}' && ${cmd}\" in front window" \
    -e 'end tell' \
    > /dev/null 2>&1
}

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e ""
echo -e "${MAGENTA}  ╔══════════════════════════════════════════════╗${RESET}"
echo -e "${MAGENTA}  ║       TrustChain — Full Stack Launcher       ║${RESET}"
echo -e "${MAGENTA}  ╚══════════════════════════════════════════════╝${RESET}"
echo -e "${GRAY}  Frontend  →  http://localhost:5173${RESET}"
echo -e "${GRAY}  Backend   →  http://localhost:8080${RESET}"
echo -e "${GRAY}  Hardhat   →  http://localhost:8545${RESET}"
echo -e ""

# ── Step 1: Hardhat node ──────────────────────────────────────────────────────
step 1 "Starting Hardhat blockchain node..."

CONTRACT_DIR="$ROOT/contracts/trustchain-task6-s1"

if [ ! -d "$CONTRACT_DIR" ]; then
  err "contracts/trustchain-task6-s1 not found. Check your repo."
  exit 1
fi

# Auto-install contract deps if node_modules is missing
if [ ! -d "$CONTRACT_DIR/node_modules" ]; then
  warn "node_modules missing — running npm install in contracts..."
  (cd "$CONTRACT_DIR" && npm install --silent)
fi

open_tab "Hardhat Node" "$CONTRACT_DIR" "npx hardhat node --port 8545"
ok "Hardhat tab launched"

# Poll until Hardhat accepts JSON-RPC (up to 30 s)
echo -e "${GRAY}      Waiting for Hardhat to be ready...${RESET}"
READY=false
for i in $(seq 1 30); do
  sleep 1
  if curl -sf -X POST http://127.0.0.1:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      > /dev/null 2>&1; then
    READY=true
    break
  fi
done

if [ "$READY" = false ]; then
  err "Hardhat did not start within 30 s. Check the Hardhat tab for errors."
  exit 1
fi
ok "Hardhat is live on port 8545"

# ── Step 2: Deploy contracts ──────────────────────────────────────────────────
if [ "$SKIP_DEPLOY" = true ]; then
  step 2 "Skipping contract deployment (--skip-deploy flag passed)"
else
  step 2 "Deploying smart contracts..."
  DEPLOY_OUT=$(cd "$CONTRACT_DIR" && npx hardhat run scripts/deploy.js --network localhost 2>&1)
  DEPLOY_EXIT=$?
  if [ $DEPLOY_EXIT -ne 0 ]; then
    err "Contract deployment failed:"
    echo "$DEPLOY_OUT"
    exit 1
  fi
  ok "Contracts deployed  →  deployments/localhost.json written"
fi

# ── Step 3: Go backend ────────────────────────────────────────────────────────
step 3 "Starting Go backend (port 8080)..."

BACKEND_DIR="$ROOT/backend"
if [ ! -d "$BACKEND_DIR" ]; then
  err "backend/ directory not found."
  exit 1
fi

open_tab "Go Backend" "$BACKEND_DIR" "go run ./cmd/server"
ok "Backend tab launched"

# Poll health endpoint (Go needs compile time — give it 60 s)
echo -e "${GRAY}      Waiting for backend to be ready (compiling Go)...${RESET}"
READY=false
for i in $(seq 1 60); do
  sleep 1
  HEALTH=$(curl -sf http://localhost:8080/api/v1/health 2>/dev/null || true)
  if echo "$HEALTH" | grep -q '"success"'; then
    READY=true
    break
  fi
done

if [ "$READY" = false ]; then
  warn "Backend health check timed out — it may still be compiling. Check the backend tab."
else
  ok "Backend is healthy on port 8080"
fi

# ── Step 4: Frontend ──────────────────────────────────────────────────────────
step 4 "Starting Vite / React frontend (port 5173)..."

FRONTEND_DIR="$ROOT/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  err "frontend/ directory not found."
  exit 1
fi

# Auto-install frontend deps if node_modules is missing
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  warn "node_modules missing — running npm install in frontend..."
  (cd "$FRONTEND_DIR" && npm install --silent)
fi

open_tab "Vite Frontend" "$FRONTEND_DIR" "npm run dev"
ok "Frontend tab launched"

# ── Step 5: Federated Learning (optional) ─────────────────────────────────────
if [ "$FL" = true ]; then
  step 5 "Starting Federated Learning server..."
  FL_DIR="$ROOT/federated"
  if [ ! -d "$FL_DIR" ]; then
    warn "federated/ directory not found — skipping FL."
  else
    if [ -z "$PYTHON" ]; then
      warn "No Python interpreter found — skipping FL. Install Python 3 or set up .venv311."
    else
      open_tab "Federated Learning" "$FL_DIR" "$PYTHON launch_fl.py"
      ok "Federated Learning tab launched ($PYTHON)"
    fi
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo -e ""
echo -e "${MAGENTA}  ╔══════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}  ║        TrustChain is running! 🚀             ║${RESET}"
echo -e "${MAGENTA}  ╚══════════════════════════════════════════════╝${RESET}"
echo -e "${CYAN}     Open your browser →  http://localhost:5173${RESET}"
echo -e ""
echo -e "${GRAY}  To stop: close the individual Terminal tabs.${RESET}"
echo -e ""

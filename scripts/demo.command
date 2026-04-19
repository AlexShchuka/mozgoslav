#!/bin/bash
# mozgoslav demo launcher — run from Finder (double-click) on macOS.
# First run bootstraps python venv + frontend node_modules; subsequent runs
# only re-install when requirements.txt / package-lock.json change.
# Starts backend + python-sidecar in background, then launches Electron UI in foreground.
# Ctrl+C in the opened Terminal window kills everything.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$REPO_ROOT"

cleanup() {
  echo "🛑 Shutting down mozgoslav..."
  jobs -p | xargs -r kill 2>/dev/null || true
  wait
}
trap cleanup EXIT INT TERM

echo "🧠 mozgoslav demo launcher"
echo "  repo: $REPO_ROOT"
echo ""

hash_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

# --- Bootstrap python-sidecar venv (idempotent) ---
SIDECAR_DIR="$REPO_ROOT/python-sidecar"
VENV_DIR="$SIDECAR_DIR/.venv"
REQ_FILE="$SIDECAR_DIR/requirements.txt"
REQ_HASH_FILE="$VENV_DIR/.requirements.sha256"

PY_BIN="$(command -v python3.11 || command -v python3 || true)"
if [ -z "$PY_BIN" ]; then
  echo "✗ python3.11 / python3 not found in PATH" >&2
  exit 1
fi

if [ ! -f "$VENV_DIR/bin/activate" ]; then
  echo "→ creating python-sidecar venv ($PY_BIN)..."
  "$PY_BIN" -m venv "$VENV_DIR"
fi

REQ_HASH_NOW="$(hash_file "$REQ_FILE")"
REQ_HASH_PREV="$(cat "$REQ_HASH_FILE" 2>/dev/null || true)"
if [ "$REQ_HASH_NOW" != "$REQ_HASH_PREV" ]; then
  echo "→ installing python-sidecar deps (first run pulls ~4GB, may take several minutes)..."
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  pip install --upgrade pip
  pip install -r "$REQ_FILE"
  deactivate
  echo "$REQ_HASH_NOW" > "$REQ_HASH_FILE"
  echo "  ✓ python-sidecar deps installed"
else
  echo "  ✓ python-sidecar venv up to date"
fi

# --- Bootstrap frontend node_modules (idempotent) ---
FRONTEND_DIR="$REPO_ROOT/frontend"
LOCK_FILE="$FRONTEND_DIR/package-lock.json"
LOCK_HASH_FILE="$FRONTEND_DIR/node_modules/.package-lock.sha256"

LOCK_HASH_NOW="$(hash_file "$LOCK_FILE")"
LOCK_HASH_PREV="$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)"
if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ "$LOCK_HASH_NOW" != "$LOCK_HASH_PREV" ]; then
  echo "→ installing frontend deps (npm ci)..."
  (cd "$FRONTEND_DIR" && npm ci)
  echo "$LOCK_HASH_NOW" > "$LOCK_HASH_FILE"
  echo "  ✓ frontend deps installed"
else
  echo "  ✓ frontend node_modules up to date"
fi

echo ""

# Backend
echo "→ starting backend (dotnet)..."
(cd backend && dotnet run --project src/Mozgoslav.Api -c Release --no-launch-profile) &
BACKEND_PID=$!

# Wait for backend /api/health
for i in {1..30}; do
  if curl -sf http://localhost:5050/api/health >/dev/null 2>&1; then
    echo "  ✓ backend up"
    break
  fi
  sleep 1
done

# Python sidecar
echo "→ starting python-sidecar..."
(cd python-sidecar && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 5051) &
SIDECAR_PID=$!

# Frontend (foreground — window blocks until user quits)
echo "→ launching electron UI..."
cd frontend
npm run dev

# When electron exits, trap fires and cleans up backend + sidecar.

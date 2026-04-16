#!/bin/bash
# mozgoslav demo launcher — run from Finder (double-click) on macOS.
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

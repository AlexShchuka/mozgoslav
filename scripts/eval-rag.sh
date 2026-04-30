#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR_DIR="$REPO_ROOT/python-sidecar"
VENV="$SIDECAR_DIR/.venv"

if [ -d "$VENV" ]; then
    source "$VENV/bin/activate"
fi

exec python "$SIDECAR_DIR/scripts/eval_rag.py" "$@"

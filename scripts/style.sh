#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
cd "${REPO_ROOT}"

targets=("${@:-all}")
should_run() {
  local name="$1"
  for t in "${targets[@]}"; do
    if [ "$t" = "all" ] || [ "$t" = "$name" ]; then
      return 0
    fi
  done
  return 1
}

log() { printf '\n==> %s\n' "$*"; }

if should_run backend && [ -d backend ]; then
  log "backend: dotnet format"
  (cd backend && dotnet format Mozgoslav.sln --verbosity minimal)
fi

if should_run frontend && [ -d frontend ]; then
  log "frontend: eslint --fix"
  (cd frontend && npx eslint --fix "src/**/*.{ts,tsx}" "electron/**/*.ts" || true)
  log "frontend: prettier --write"
  (cd frontend && npx prettier --write "src/**/*.{ts,tsx,css,md,json}" "electron/**/*.ts")
fi

if should_run python && [ -d python-sidecar ]; then
  log "python: ruff --fix"
  (cd python-sidecar && (ruff check --fix . || true))
  log "python: black"
  (cd python-sidecar && black .)
fi

if should_run swift && [ -d native ]; then
  if command -v swift-format >/dev/null 2>&1; then
    log "native: swift-format"
    find native -name '*.swift' -print0 | xargs -0 swift-format -i
  else
    log "native: swift-format not installed, skipping"
  fi
fi

if should_run comments; then
  if command -v uncomment >/dev/null 2>&1; then
    log "strip comments (uncomment)"
    uncomment --remove-todo --remove-fixme --remove-doc \
      backend frontend/src frontend/electron python-sidecar native scripts
  else
    log "uncomment not installed (pip install uncomment==3.0.2), skipping"
  fi
fi

log "style: done"

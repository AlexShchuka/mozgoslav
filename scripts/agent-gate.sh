#!/usr/bin/env bash
# One-shot local reproduction of every gate CI runs. Fail-fast.
#
# Usage:
#   bash scripts/agent-gate.sh              # all stacks
#   bash scripts/agent-gate.sh backend      # scoped (backend|frontend|python|native|verify)
#
# Requirements: dotnet 10, node 24, python 3.11+, ruff, black, swift 6 (macOS only).
# On Linux the `native` stage is skipped automatically.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
cd "${REPO_ROOT}"

STAGE="${1:-all}"

section() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }

run_verify() {
  section "verify — encoding + comments + grep guards + ADR discipline"
  bash scripts/check-encoding.sh
  uncomment --dry-run --remove-todo --remove-fixme --remove-doc \
    backend frontend/src frontend/electron python-sidecar native scripts
  bash scripts/check-grep-guards.sh
  bash scripts/check-adr-discipline.sh
}

run_backend() {
  section "backend — format + build + tests"
  dotnet format backend/Mozgoslav.sln --verbosity minimal
  dotnet format backend/Mozgoslav.sln --verify-no-changes --verbosity minimal
  dotnet build  backend/Mozgoslav.sln -maxcpucount:1 -warnaserror
  dotnet test   backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj \
    --settings backend/UnitTests.runsettings -maxcpucount:1
  dotnet test   backend/tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj \
    --settings backend/IntegrationTests.runsettings -maxcpucount:1
}

run_frontend() {
  section "frontend — format + typecheck + lint + tests"
  (cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}" "electron/**/*.ts")
  (cd frontend && npm run typecheck)
  (cd frontend && npm run lint)
  (cd frontend && npm run check-styles)
  (cd frontend && npm run check-translations)
  (cd frontend && npx prettier --check "src/**/*.{ts,tsx,css}" "electron/**/*.ts")
  (cd frontend && npm test -- --watchAll=false)
}

run_python() {
  section "python — ruff + black + pytest"
  (cd python-sidecar && ruff check .)
  (cd python-sidecar && black --check .)
  (cd python-sidecar && pytest -q)
}

run_native() {
  if [[ "$(uname)" != "Darwin" ]]; then
    section "native — skipped (not macOS)"
    return
  fi
  section "native — swift build + test"
  (cd native/MozgoslavDictationHelper && swift build -c release)
  (cd native/MozgoslavDictationHelper && swift test)
}

case "${STAGE}" in
  verify)   run_verify ;;
  backend)  run_backend ;;
  frontend) run_frontend ;;
  python)   run_python ;;
  native)   run_native ;;
  all)      run_verify; run_backend; run_frontend; run_python; run_native ;;
  *)        echo "unknown stage: ${STAGE}" >&2; exit 2 ;;
esac

section "✓ all requested gates green"

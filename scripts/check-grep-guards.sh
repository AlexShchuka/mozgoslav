#!/usr/bin/env bash
# Phase-exit grep guards (per #197). Each guard asserts that a forbidden
# pattern is absent from a list of paths. Adding a new guard = adding one
# entry to the GUARDS array — no other edits required.
#
# Guard format (one line per entry, fields separated by ASCII 0x1F):
#   label<US>pattern<US>path1<US>path2<US>...
#
# Failure mode: print the offending matches, exit non-zero.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
cd "${REPO_ROOT}"

US=$'\x1f'

# Define guards here. Each entry is one labelled invariant.
GUARDS=(
  "frontend-graphqlClient-jest-mock-banned${US}jest\\.mock\\(['\"]\\.\\.\\/\\.\\.\\/api\\/graphqlClient['\"]\\)|jest\\.mock\\(['\"]graphqlClient['\"]\\)${US}frontend/src/features${US}frontend/src/components"
  "frontend-no-bare-fetch-in-features${US}^[^/].*\\bfetch\\(${US}frontend/src/features${US}frontend/src/components"
)

# Paths that may legitimately contain the otherwise-banned shape; matches
# are filtered out via fixed-string substring search.
ALLOWLIST=(
  "frontend/src/api/dictationPush.ts"
)

is_allowlisted() {
  local path="$1"
  for allowed in "${ALLOWLIST[@]}"; do
    if [[ "${path}" == *"${allowed}"* ]]; then
      return 0
    fi
  done
  return 1
}

violations=0
report=$(mktemp)
trap 'rm -f "$report"' EXIT

run_guard() {
  local label="$1"; shift
  local pattern="$1"; shift
  local -a paths=("$@")
  local -a existing=()

  for p in "${paths[@]}"; do
    if [[ -e "${p}" ]]; then
      existing+=("${p}")
    fi
  done

  if [[ ${#existing[@]} -eq 0 ]]; then
    printf '  %s — skipped (no paths exist)\n' "${label}"
    return 0
  fi

  local raw
  raw=$(grep -rEn "${pattern}" "${existing[@]}" 2>/dev/null || true)
  if [[ -z "${raw}" ]]; then
    printf '  %s — clean\n' "${label}"
    return 0
  fi

  local filtered=""
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    local file="${line%%:*}"
    if is_allowlisted "${file}"; then
      continue
    fi
    filtered+="${line}"$'\n'
  done <<< "${raw}"

  if [[ -z "${filtered}" ]]; then
    printf '  %s — clean (only allowlisted hits)\n' "${label}"
    return 0
  fi

  {
    printf '\n[%s] forbidden pattern matched (pattern: %s):\n' "${label}" "${pattern}"
    printf '%s' "${filtered}"
  } >>"${report}"
  violations=$((violations+1))
}

printf 'check-grep-guards: %d guard(s)\n' "${#GUARDS[@]}"
for entry in "${GUARDS[@]}"; do
  IFS="${US}" read -r -a fields <<< "${entry}"
  label="${fields[0]}"
  pattern="${fields[1]}"
  paths=("${fields[@]:2}")
  run_guard "${label}" "${pattern}" "${paths[@]}"
done

if [[ "${violations}" -gt 0 ]]; then
  echo
  echo "check-grep-guards: ${violations} guard(s) failed:" >&2
  cat "${report}" >&2
  exit 1
fi

echo
echo "check-grep-guards: all guards green"

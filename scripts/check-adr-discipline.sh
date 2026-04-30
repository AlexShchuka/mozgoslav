#!/usr/bin/env bash
# ADR discipline gate (per #199). Fails when a multi-phase initiative
# (>= 3 `feat(*)` or `refactor(*)` commits in the diff range) lands without
# at least one of:
#   - an ADR file added under docs/adr/ in the same range, OR
#   - a `Closes #N` / `See #N` reference in any commit body to a GitHub
#     `type/decision` issue (we cannot probe labels offline, so any issue
#     reference is accepted as a structural anchor — the issue label gate
#     belongs in CI server-side; here we just enforce the link exists).
#
# Range:
#   - if BASE_REF env is set, use $BASE_REF..HEAD;
#   - elif origin/main exists, use origin/main..HEAD;
#   - else fall back to HEAD~1..HEAD (single commit).
#
# Skipped commit types (do not count toward the threshold):
#   chore docs style test build ci fix perf
# (`fix` skipped — bugfix initiatives don't require an ADR; refactors do.)

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
cd "${REPO_ROOT}"

THRESHOLD=3

resolve_range() {
  if [[ -n "${BASE_REF:-}" ]]; then
    echo "${BASE_REF}..HEAD"
    return
  fi
  if git rev-parse --verify --quiet origin/main >/dev/null; then
    echo "origin/main..HEAD"
    return
  fi
  if git rev-parse --verify --quiet HEAD~1 >/dev/null; then
    echo "HEAD~1..HEAD"
    return
  fi
  echo "HEAD"
}

RANGE="$(resolve_range)"
printf 'check-adr-discipline: range = %s\n' "${RANGE}"

mapfile -t COMMITS < <(git log --format='%H' "${RANGE}" 2>/dev/null || true)

if [[ ${#COMMITS[@]} -eq 0 ]]; then
  echo "check-adr-discipline: empty range — nothing to check"
  exit 0
fi

trigger_count=0
trigger_subjects=()
for sha in "${COMMITS[@]}"; do
  subject=$(git log -1 --format='%s' "${sha}")
  if [[ "${subject}" =~ ^(feat|refactor)(\([^\)]+\))?!?: ]]; then
    trigger_count=$((trigger_count+1))
    trigger_subjects+=("${sha:0:8} ${subject}")
  fi
done

printf 'check-adr-discipline: %d feat/refactor commit(s) in range (threshold = %d)\n' \
  "${trigger_count}" "${THRESHOLD}"

if [[ "${trigger_count}" -lt "${THRESHOLD}" ]]; then
  echo "check-adr-discipline: under threshold — gate inactive"
  exit 0
fi

new_adrs=$(git diff --name-only --diff-filter=A "${RANGE}" -- 'docs/adr/' 2>/dev/null || true)

issue_refs=""
for sha in "${COMMITS[@]}"; do
  body=$(git log -1 --format='%B' "${sha}")
  while IFS= read -r ref; do
    [[ -z "${ref}" ]] && continue
    issue_refs+="${ref}"$'\n'
  done < <(printf '%s\n' "${body}" | grep -Eio '(Closes|Fixes|Resolves|See|Refs?)[[:space:]]+#[0-9]+' || true)
done

if [[ -n "${new_adrs}" ]]; then
  echo "check-adr-discipline: ADR file(s) shipped in range:"
  printf '  - %s\n' ${new_adrs}
  exit 0
fi

if [[ -n "${issue_refs}" ]]; then
  echo "check-adr-discipline: decision-issue link(s) found in commit bodies:"
  printf '%s' "${issue_refs}" | sort -u | sed 's/^/  - /'
  exit 0
fi

{
  echo "check-adr-discipline: FAIL"
  echo "  ${trigger_count} feat/refactor commit(s) in range without an ADR file or decision-issue link."
  echo "  Trigger commits:"
  printf '    %s\n' "${trigger_subjects[@]}"
  echo
  echo "  Fix: either"
  echo "    - add an ADR file under docs/adr/ in this PR, OR"
  echo "    - add 'Closes #<type/decision-issue>' to one commit body."
} >&2
exit 1

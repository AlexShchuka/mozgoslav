#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"

cd "${REPO_ROOT}"

violations=0
report=$(mktemp)
trap 'rm -f "$report"' EXIT

windows_suffixes_regex='\.(bat|cmd|ps1)$'
bom_allowlist_regex='(\.sln$|EfMigrations/.+\.(Designer\.cs|cs)$|ModelSnapshot\.cs$)'

while IFS= read -r f; do
  [ -f "$f" ] || continue
  mime=$(file --brief --mime "$f")
  case "$mime" in
    *charset=binary*)  continue ;;
    *charset=utf-8*|*charset=us-ascii*) ;;
    *)
      printf 'encoding: %s (%s)\n' "$f" "$mime" >>"$report"
      violations=$((violations+1))
      continue
      ;;
  esac

  if [[ ! "$f" =~ $bom_allowlist_regex ]]; then
    if head -c 3 "$f" | od -An -tx1 | tr -d ' \n' | grep -q '^efbbbf'; then
      printf 'bom: %s\n' "$f" >>"$report"
      violations=$((violations+1))
    fi
  fi

  if [[ ! "$f" =~ $windows_suffixes_regex ]]; then
    if grep -lI $'\r' "$f" >/dev/null 2>&1; then
      printf 'crlf: %s\n' "$f" >>"$report"
      violations=$((violations+1))
    fi
  fi
done < <(git ls-files)

if [ "$violations" -gt 0 ]; then
  echo "check-encoding: ${violations} violation(s):" >&2
  cat "$report" >&2
  exit 1
fi

echo "check-encoding: clean"

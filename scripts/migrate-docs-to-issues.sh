#!/usr/bin/env bash
set -euo pipefail

# Migrate every docs/features/<feature>/{backlog,decisions,bugs}/<slug>.md
# file to a GitHub Issue and git-mv the source into .archive/<feature>-<type>-<basename>.md.
#
# Idempotent: iterates current docs/features/**/*.md, so a second run has
# nothing to find after the first run archives the sources.
#
# Requirements:
#   - gh CLI authenticated (GH_TOKEN or GITHUB_TOKEN)
#   - repository checkout with git
#
# Env:
#   REPO_SLUG   e.g. AlexShchuka/mozgoslav (defaults to origin remote)
#   DRY_RUN     if "1", prints planned actions without creating issues

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
cd "${REPO_ROOT}"

DRY_RUN="${DRY_RUN:-0}"
REPO_SLUG="${REPO_SLUG:-}"
if [ -z "${REPO_SLUG}" ]; then
  origin_url=$(git remote get-url origin 2>/dev/null || true)
  REPO_SLUG=$(echo "${origin_url}" \
    | sed -E 's#^.*github\.com[:/]([^/]+/[^/.]+)(\.git)?.*$#\1#')
fi
if [ -z "${REPO_SLUG}" ]; then
  echo "[migrate] cannot resolve REPO_SLUG — set it explicitly" >&2
  exit 1
fi
echo "[migrate] target repo: ${REPO_SLUG}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[migrate] gh CLI not installed" >&2
  exit 1
fi

gh_api() { gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "$@"; }

ensure_label() {
  local name="$1" color="$2" description="$3"
  local encoded
  encoded=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=""))' "${name}")
  if gh_api "repos/${REPO_SLUG}/labels/${encoded}" >/dev/null 2>&1; then
    return 0
  fi
  if [ "${DRY_RUN}" = "1" ]; then
    echo "[migrate] would create label ${name}"
    return 0
  fi
  gh_api --method POST "repos/${REPO_SLUG}/labels" \
    -f "name=${name}" -f "color=${color}" -f "description=${description}" >/dev/null
  echo "[migrate] created label ${name}"
}

derive_feature_labels() {
  local features=()
  while IFS= read -r d; do
    features+=("$(basename "${d}")")
  done < <(find docs/features -mindepth 1 -maxdepth 1 -type d | sort)
  for f in "${features[@]}"; do
    ensure_label "feature/${f}" "1d76db" "Scope: ${f}"
  done
}

derive_type_labels() {
  ensure_label "type/backlog"  "fbca04" "Deferred work item"
  ensure_label "type/decision" "0e8a16" "Shipped architectural decision"
  ensure_label "type/bug"      "d73a4a" "Known defect"
}

extract_title() {
  local path="$1"
  local title
  title=$(awk '
    BEGIN { inyaml=0 }
    NR==1 && $0 ~ /^---[[:space:]]*$/ { inyaml=1; next }
    inyaml==1 && $0 ~ /^---[[:space:]]*$/ { inyaml=0; next }
    inyaml==1 { next }
    /^# / { sub(/^# +/, ""); print; exit }
  ' "${path}")
  if [ -z "${title}" ]; then
    title=$(basename "${path}" .md)
  fi
  echo "${title}"
}

extract_status() {
  local path="$1"
  awk '
    BEGIN { inyaml=0 }
    NR==1 && $0 ~ /^---[[:space:]]*$/ { inyaml=1; next }
    inyaml==1 && $0 ~ /^---[[:space:]]*$/ { exit }
    inyaml==1 && $0 ~ /^status:/ {
      sub(/^status:[[:space:]]*/, "")
      gsub(/["\047]/, "")
      print
      exit
    }
  ' "${path}"
}

build_body() {
  local path="$1"
  {
    echo "<!-- migrated from ${path} -->"
    echo ""
    cat "${path}"
  }
}

create_issue() {
  local path="$1" feature="$2" type="$3"
  local title status labels body_file
  title=$(extract_title "${path}")
  status=$(extract_status "${path}" || true)

  labels="feature/${feature},type/${type}"
  if [ -n "${status}" ]; then
    local status_slug
    status_slug=$(echo "${status}" | tr '[:upper:] _' '[:lower:]--' | tr -cd 'a-z0-9-')
    if [ -n "${status_slug}" ]; then
      ensure_label "status/${status_slug}" "c5def5" "Lifecycle status: ${status}"
      labels="${labels},status/${status_slug}"
    fi
  fi

  body_file=$(mktemp)
  build_body "${path}" >"${body_file}"

  if [ "${DRY_RUN}" = "1" ]; then
    echo "[migrate] [dry] ${path} -> '${title}' labels=${labels}"
    rm -f "${body_file}"
    return 0
  fi

  local url
  url=$(gh issue create --repo "${REPO_SLUG}" --title "${title}" --body-file "${body_file}" --label "${labels}")
  rm -f "${body_file}"
  echo "[migrate] ${path} -> ${url}"
}

archive_file() {
  local path="$1" feature="$2" type="$3"
  local base dest
  base=$(basename "${path}")
  dest=".archive/${feature}-${type}-${base}"
  if [ "${DRY_RUN}" = "1" ]; then
    echo "[migrate] [dry] git mv ${path} ${dest}"
    return 0
  fi
  mkdir -p .archive
  if [ -e "${dest}" ]; then
    dest=".archive/${feature}-${type}-$(date -u +%Y%m%d%H%M%S)-${base}"
  fi
  git mv "${path}" "${dest}"
  echo "[migrate] archived ${path} -> ${dest}"
}

singular_type() {
  case "$1" in
    backlog)   echo "backlog" ;;
    decisions) echo "decision" ;;
    bugs)      echo "bug" ;;
    *)         echo "$1" ;;
  esac
}

process_tree() {
  local dir="$1"
  local label_type
  label_type=$(singular_type "${dir}")
  while IFS= read -r path; do
    [ -e "${path}" ] || continue
    local feature
    feature=$(echo "${path}" | awk -F/ '{print $3}')
    create_issue "${path}" "${feature}" "${label_type}"
    archive_file "${path}" "${feature}" "${label_type}"
  done < <(find "docs/features" -type f -path "*/${dir}/*.md" | sort)
}

main() {
  derive_feature_labels
  derive_type_labels
  process_tree backlog
  process_tree decisions
  process_tree bugs
  echo "[migrate] done"
}

main "$@"

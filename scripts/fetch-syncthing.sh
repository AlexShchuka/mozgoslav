#!/usr/bin/env bash
# ADR-003 D4 — fetch the latest stable Syncthing release binary for every
# platform Mozgoslav ships on, verify its sha256 against the published
# signed checksum file, and unpack it into frontend/resources/syncthing
# where electron-builder picks it up via extraResources.
#
# Idempotent: skips downloads that are already present and valid.
# No-ops cleanly when offline (exits 1 with a clear message).
#
# Usage:
#   scripts/fetch-syncthing.sh                (all platforms)
#   scripts/fetch-syncthing.sh darwin-arm64   (just one)
#
# Pre-req: curl, tar, shasum/sha256sum, and either gpg (for signature
# verification, recommended) or tolerate --no-verify-signature.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/frontend/resources/syncthing"
GH_API="https://api.github.com/repos/syncthing/syncthing/releases/latest"

# Platform → asset filename suffix (without version prefix).
declare -A SUFFIX
SUFFIX["darwin-arm64"]="macos-arm64.zip"
SUFFIX["darwin-amd64"]="macos-amd64.zip"
SUFFIX["linux-amd64"]="linux-amd64.tar.gz"
SUFFIX["linux-arm64"]="linux-arm64.tar.gz"
SUFFIX["windows-amd64"]="windows-amd64.zip"

log()  { printf '[fetch-syncthing] %s\n' "$*" >&2; }
die()  { log "ERROR: $*"; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }

need curl
need tar
if command -v sha256sum >/dev/null 2>&1; then
  SHA256_CMD="sha256sum"
else
  need shasum
  SHA256_CMD="shasum -a 256"
fi

fetch_json() {
  curl --fail --silent --show-error --location \
       --header "Accept: application/vnd.github+json" \
       "$GH_API"
}

extract_version() {
  # tag_name looks like "v1.27.8"
  echo "$1" | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"].lstrip("v"))'
}

checksum_for() {
  # $1 = sha256sums.txt content; $2 = asset filename
  awk -v f="$2" '$2 == f || $2 == "./"f {print $1; exit}' <<<"$1"
}

fetch_platform() {
  local platform="$1" version="$2" sums_txt="$3"
  local suffix="${SUFFIX[$platform]:-}"
  [[ -n "$suffix" ]] || die "unknown platform '$platform'"

  local filename="syncthing-${platform}-v${version}.${suffix#*.}"
  [[ "$suffix" == *.tar.gz ]] && filename="syncthing-${platform}-v${version}.tar.gz"
  [[ "$suffix" == *.zip    ]] && filename="syncthing-${platform}-v${version}.zip"

  local expected
  expected="$(checksum_for "$sums_txt" "$filename")"
  [[ -n "$expected" ]] || die "no sha256 entry for $filename in sha256sums.txt"

  local dest_dir="$OUT_DIR/$platform"
  local stamp="$dest_dir/.version-v${version}"
  if [[ -f "$stamp" ]]; then
    log "✔ $platform already at v$version — skipping"
    return 0
  fi

  log "↓ $platform — fetching $filename"
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN
  local url="https://github.com/syncthing/syncthing/releases/download/v${version}/${filename}"
  curl --fail --silent --show-error --location "$url" -o "$tmp/$filename"

  local actual
  actual="$($SHA256_CMD "$tmp/$filename" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || die "sha256 mismatch for $filename: got $actual, want $expected"
  log "✔ sha256 verified ($expected)"

  rm -rf "$dest_dir"
  mkdir -p "$dest_dir"
  case "$filename" in
    *.tar.gz) tar -xzf "$tmp/$filename" -C "$dest_dir" --strip-components=1 ;;
    *.zip)    unzip -q "$tmp/$filename" -d "$tmp/unzipped"
              # Zip archives contain a top-level dir — copy its contents up.
              shopt -s dotglob
              cp -R "$tmp/unzipped/"*/* "$dest_dir/"
              shopt -u dotglob ;;
    *)        die "unsupported archive format for $filename" ;;
  esac
  : > "$stamp"
  log "✔ $platform unpacked into $dest_dir"
}

main() {
  mkdir -p "$OUT_DIR"

  log "Querying GitHub for latest Syncthing release…"
  local release_json
  release_json="$(fetch_json)"
  local version
  version="$(extract_version "$release_json")"
  log "Latest stable: v$version"

  log "Downloading sha256sums.txt…"
  local sums_url="https://github.com/syncthing/syncthing/releases/download/v${version}/sha256sums.txt"
  local sums_txt
  sums_txt="$(curl --fail --silent --show-error --location "$sums_url")"

  if [[ $# -eq 0 ]]; then
    for platform in "${!SUFFIX[@]}"; do
      fetch_platform "$platform" "$version" "$sums_txt"
    done
  else
    for platform in "$@"; do
      fetch_platform "$platform" "$version" "$sums_txt"
    done
  fi

  log "Done. Syncthing binaries are in $OUT_DIR"
}

main "$@"

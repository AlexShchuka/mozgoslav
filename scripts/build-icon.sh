#!/usr/bin/env bash
# Plan v0.8 Block 7 §2.5 — generate frontend/build/icon.icns from the source PNG.
#
# Requires macOS (iconutil ships with Xcode CLT). On Linux/Windows, ship the
# pre-built icon.icns committed alongside the source PNG.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
SOURCE_PNG="${REPO_ROOT}/frontend/build/icon-source.png"
TARGET_ICNS="${REPO_ROOT}/frontend/build/icon.icns"

if [ ! -f "${SOURCE_PNG}" ]; then
  echo "[build-icon] source PNG missing at ${SOURCE_PNG}" >&2
  echo "[build-icon] Place a 1024x1024 PNG at that path and re-run." >&2
  exit 1
fi

if ! command -v iconutil > /dev/null; then
  echo "[build-icon] iconutil is unavailable — this script requires macOS." >&2
  exit 1
fi

TMP="$(mktemp -d)/icon.iconset"
mkdir -p "${TMP}"
for size in 16 32 64 128 256 512 1024; do
  sips -z ${size} ${size} "${SOURCE_PNG}" --out "${TMP}/icon_${size}x${size}.png" > /dev/null
  double=$((size * 2))
  sips -z ${double} ${double} "${SOURCE_PNG}" --out "${TMP}/icon_${size}x${size}@2x.png" > /dev/null
done

iconutil -c icns -o "${TARGET_ICNS}" "${TMP}"
echo "[build-icon] wrote ${TARGET_ICNS}"

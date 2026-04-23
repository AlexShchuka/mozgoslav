#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
MANIFEST="${REPO_ROOT}/frontend/build/bundle-models.manifest.json"
TARGET_DIR="${REPO_ROOT}/frontend/build/bundle-models"

if [ ! -f "${MANIFEST}" ]; then
  echo "[fetch-bundle-models] manifest missing at ${MANIFEST}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

TAG=$(python3 -c "import json,sys;m=json.load(open(sys.argv[1]));print(m.get('release_tag',''))" "${MANIFEST}")
if [ -z "${TAG}" ]; then
  echo "[fetch-bundle-models] release_tag is empty in ${MANIFEST} — skipping fetch."
  echo "[fetch-bundle-models] The DMG will ship without bundled models until shuka pins the tag."
  exit 0
fi

PYTHON_BIN=$(command -v python3 || command -v python)
if [ -z "${PYTHON_BIN}" ]; then
  echo "[fetch-bundle-models] python3 is required" >&2
  exit 1
fi

SHA256_CMD=""
if command -v shasum > /dev/null; then
  SHA256_CMD="shasum -a 256"
elif command -v sha256sum > /dev/null; then
  SHA256_CMD="sha256sum"
else
  echo "[fetch-bundle-models] neither shasum nor sha256sum found" >&2
  exit 1
fi

ENTRIES=$("${PYTHON_BIN}" -c "
import json, sys
m = json.load(open(sys.argv[1]))
for f in m.get('files', []):
    print('|'.join([f['filename'], f['sha256'], str(f.get('size', ''))]))
" "${MANIFEST}")

RELEASE_BASE="https://github.com/AlexShchuka/mozgoslav/releases/download/${TAG}"

while IFS='|' read -r FILENAME EXPECTED_SHA SIZE; do
  [ -z "${FILENAME}" ] && continue
  DEST="${TARGET_DIR}/${FILENAME}"

  if [ -f "${DEST}" ]; then
    ACTUAL_SHA=$(${SHA256_CMD} "${DEST}" | awk '{print $1}')
    if [ "${ACTUAL_SHA}" = "${EXPECTED_SHA}" ]; then
      echo "[fetch-bundle-models] cached: ${FILENAME}"
      continue
    fi
    echo "[fetch-bundle-models] sha256 mismatch for ${FILENAME} — redownloading"
    rm -f "${DEST}"
  fi

  URL="${RELEASE_BASE}/${FILENAME}"
  echo "[fetch-bundle-models] downloading ${FILENAME} from ${URL}"
  curl --fail --location --retry 3 --show-error -o "${DEST}" "${URL}"

  ACTUAL_SHA=$(${SHA256_CMD} "${DEST}" | awk '{print $1}')
  if [ "${ACTUAL_SHA}" != "${EXPECTED_SHA}" ]; then
    echo "[fetch-bundle-models] checksum mismatch after download: ${FILENAME}" >&2
    echo "  expected ${EXPECTED_SHA}" >&2
    echo "  actual   ${ACTUAL_SHA}" >&2
    exit 1
  fi
done <<< "${ENTRIES}"

echo "[fetch-bundle-models] all Tier-1 bundle files verified in ${TARGET_DIR}"

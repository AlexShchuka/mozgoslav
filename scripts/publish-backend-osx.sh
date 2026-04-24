#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"

ARCH="${1:-osx-arm64}"
CONFIGURATION="${CONFIGURATION:-Release}"
TARGET_DIR="${REPO_ROOT}/frontend/resources/backend"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "[publish-backend-osx] dotnet SDK not found on PATH" >&2
  exit 1
fi

rm -rf "${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"

cd "${REPO_ROOT}/backend"
dotnet publish src/Mozgoslav.Api/Mozgoslav.Api.csproj \
  -c "${CONFIGURATION}" \
  -r "${ARCH}" \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -p:PublishTrimmed=false \
  -o "${TARGET_DIR}" \
  -maxcpucount:1

cd "${TARGET_DIR}"
if [ ! -f "Mozgoslav.Api" ]; then
  echo "[publish-backend-osx] expected Mozgoslav.Api binary under ${TARGET_DIR}" >&2
  ls -la
  exit 1
fi

chmod +x Mozgoslav.Api
echo "[publish-backend-osx] published to ${TARGET_DIR}"

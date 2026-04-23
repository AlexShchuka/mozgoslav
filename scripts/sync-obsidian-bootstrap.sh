#!/usr/bin/env bash

set -euo pipefail

SRC="${1:-$HOME/workspace/obsidian-vault-bootstrap}"
DST="$(cd "$(dirname "$0")/.." && pwd)/backend/src/Mozgoslav.Infrastructure/Resources/ObsidianBootstrap"

if [ ! -d "$SRC" ]; then
    echo "Source bootstrap tree not found at: $SRC" >&2
    exit 1
fi

echo "Syncing $SRC → $DST"
mkdir -p "$DST"
rsync -av --delete \
    --exclude 'manifest.json' \
    --exclude 'write-policy.json' \
    --exclude 'pinned-plugins.json' \
    "$SRC/" "$DST/"

for d in archive ideas insights people questions tasks; do
    if [ -d "$DST/$d" ] && [ -z "$(ls -A "$DST/$d")" ]; then
        : > "$DST/$d/.gitkeep"
    fi
done

echo "Sync done. Next build will regenerate manifest.json via the"
echo "GenerateObsidianBootstrapManifest MSBuild target."

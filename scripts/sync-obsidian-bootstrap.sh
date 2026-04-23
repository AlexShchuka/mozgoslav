#!/usr/bin/env bash
# ADR-019 §6.1 — sync obsidian-vault-bootstrap source repo into
# backend/src/Mozgoslav.Infrastructure/Resources/ObsidianBootstrap/
# and regenerate manifest.json. The MSBuild target
# GenerateObsidianBootstrapManifest also regenerates manifest.json on
# every build, so running this script is only required when the source
# bootstrap tree changes. CI does not call this script.

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

# .gitkeep placeholders for empty directories that rsync would otherwise
# materialise as empty — embedded resources require files.
for d in archive ideas insights people questions tasks; do
    if [ -d "$DST/$d" ] && [ -z "$(ls -A "$DST/$d")" ]; then
        : > "$DST/$d/.gitkeep"
    fi
done

echo "Sync done. Next build will regenerate manifest.json via the"
echo "GenerateObsidianBootstrapManifest MSBuild target."

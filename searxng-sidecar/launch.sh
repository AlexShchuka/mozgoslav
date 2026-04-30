#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SETTINGS_DIR="${MOZGOSLAV_APP_SUPPORT:-$HOME/Library/Application Support/Mozgoslav}/searxng"
USER_SETTINGS="$SETTINGS_DIR/settings.yml"
BUNDLED_SETTINGS="$SCRIPT_DIR/settings.yml"

if [ ! -f "$USER_SETTINGS" ]; then
  mkdir -p "$SETTINGS_DIR"
  cp "$BUNDLED_SETTINGS" "$USER_SETTINGS"
fi

VENV_DIR="$SCRIPT_DIR/.venv"
HASH_FILE="$VENV_DIR/.installed-hash"
REQUIREMENTS="$SCRIPT_DIR/requirements.txt"

current_hash="$(sha256sum "$REQUIREMENTS" | awk '{print $1}')"

if [ ! -d "$VENV_DIR" ] || [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE")" != "$current_hash" ]; then
  rm -rf "$VENV_DIR"
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --quiet -r "$REQUIREMENTS"
  echo "$current_hash" > "$HASH_FILE"
fi

SEARXNG_SETTINGS_PATH="$USER_SETTINGS" exec "$VENV_DIR/bin/python" -m searx.webapp

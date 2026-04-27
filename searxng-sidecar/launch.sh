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

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --quiet -r "$SCRIPT_DIR/requirements.txt"
fi

exec "$VENV_DIR/bin/searxng-run" \
  --settings "$USER_SETTINGS"

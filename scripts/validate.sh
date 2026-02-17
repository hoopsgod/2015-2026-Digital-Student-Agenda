#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_JS="$ROOT_DIR/app.js"

if [[ ! -f "$APP_JS" ]]; then
  echo "❌ Could not find $APP_JS"
  exit 1
fi

node --check "$APP_JS"

echo "✅ Validation passed: app.js parses successfully."

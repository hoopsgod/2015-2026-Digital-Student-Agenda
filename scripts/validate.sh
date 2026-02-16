#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_FILE="$ROOT_DIR/index.html"
TMP_JS="/tmp/agenda-inline.js"

if [[ ! -f "$INDEX_FILE" ]]; then
  echo "❌ Could not find $INDEX_FILE"
  exit 1
fi

# Extract the inline JS payload from index.html and run a syntax check.
python - <<'PY'
from pathlib import Path
import re

index = Path('index.html')
text = index.read_text(encoding='utf-8')
match = re.search(r'<script>([\s\S]*)</script>', text)
if not match:
    raise SystemExit('No <script>...</script> block found in index.html')
Path('/tmp/agenda-inline.js').write_text(match.group(1), encoding='utf-8')
print(f"Extracted inline JS to /tmp/agenda-inline.js ({len(match.group(1))} bytes)")
PY

node --check "$TMP_JS"

echo "✅ Validation passed: inline JavaScript parses successfully."

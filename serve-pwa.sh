#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-4173}"

echo "🏗️  Building PWA bundle..."
"$ROOT_DIR/build.sh"

echo "🌐 Serving static PWA from frontend/dist on http://localhost:${PORT}"
cd "$ROOT_DIR/frontend/dist"

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo "Python not found. Install Python or use: npx serve -s . -l ${PORT}"
  exit 1
fi

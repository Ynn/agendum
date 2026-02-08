#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-4173}"
HOST="${HOST:-127.0.0.1}"

echo "🏗️  Building PWA bundle..."
"$ROOT_DIR/build.sh"

echo "🌐 Serving static PWA from frontend/dist on http://${HOST}:${PORT}"
echo "ℹ️  For service worker + installability, use localhost/127.0.0.1 (or HTTPS), not a LAN IP."
cd "$ROOT_DIR/frontend/dist"

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server --bind "$HOST" "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server --bind "$HOST" "$PORT"
else
  echo "Python not found. Install Python or use: npx serve -s . -l ${PORT}"
  exit 1
fi

#!/usr/bin/env bash
# Builds the React SPA and drops it into backend/public/ so the server
# only ever needs `git pull` — no Node, no npm, no build step there.
# Run this locally before every deploy, then commit + push the result:
#   ./build-frontend.sh && git add backend/public/spa.html backend/public/assets && git commit -m "..." && git push
set -euo pipefail
cd "$(dirname "$0")"

echo "Building frontend..."
(cd frontend && npm install && npm run build)

echo "Copying build into backend/public/..."
rm -rf backend/public/assets
cp -r frontend/dist/assets backend/public/assets
cp frontend/dist/index.html backend/public/spa.html

echo "Done. backend/public/spa.html + backend/public/assets/ are ready to commit."

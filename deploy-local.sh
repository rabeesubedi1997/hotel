#!/usr/bin/env bash
# Run this locally before every deploy. Builds the frontend, drops it into
# backend/public/ (so the server never needs Node), and commits + pushes
# everything so the server side (deploy-server.sh) only needs `git pull`.
#
# Usage: ./deploy-local.sh "commit message"
set -euo pipefail
cd "$(dirname "$0")"

MESSAGE="${1:-Deploy: update frontend build}"

echo "==> Building frontend..."
(cd frontend && npm install && npm run build)

echo "==> Copying build into backend/public/..."
rm -rf backend/public/assets
cp -r frontend/dist/assets backend/public/assets
cp frontend/dist/index.html backend/public/spa.html

echo "==> Committing and pushing..."
git add -A -- ':!backend/routes.txt'
if git diff --cached --quiet; then
  echo "Nothing changed — nothing to commit."
else
  git commit -m "$MESSAGE"
  git push origin main
  echo "==> Pushed. Now run deploy-server.sh on the server."
fi

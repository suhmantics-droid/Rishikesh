#!/usr/bin/env bash
# Run by cron every 15 minutes: if GitHub's main branch has new commits, rebuild and restart.
# The database and flyer photos in ./data are never touched.
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/pinned-update.lock
flock -n 9 || exit 0 # a build is already running
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && exit 0
git reset -q --hard origin/main
export GIT_SHA=$(git rev-parse --short HEAD)
docker compose up -d --build
docker image prune -f >/dev/null
echo "$(date) updated to ${GIT_SHA}"

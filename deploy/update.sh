#!/usr/bin/env bash
# Pull the latest code and rebuild. Data in ./data is untouched.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
export GIT_SHA=$(git rev-parse --short HEAD)
sudo -E docker compose up -d --build
sudo docker image prune -f >/dev/null
echo "Updated."

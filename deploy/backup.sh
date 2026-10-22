#!/usr/bin/env bash
# Snapshot the database and flyer images into deploy/backups (keeps the last 14).
# Copy that folder somewhere else now and then (Google Drive via rclone, or just scp it home).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p deploy/backups
STAMP=$(date +%Y-%m-%d)
# Consistent copy of the live SQLite database, taken inside the running app container.
sudo docker compose exec -T app node -e "require('better-sqlite3')('/data/app.db').backup('/data/backup.db').then(()=>process.exit(0))"
sudo tar czf "deploy/backups/pinned-${STAMP}.tgz" -C data backup.db uploads
sudo rm -f data/backup.db
ls -1t deploy/backups/pinned-*.tgz | tail -n +15 | xargs -r rm -f
echo "$(date) backup ok: deploy/backups/pinned-${STAMP}.tgz"

#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Pinned · one-paste server setup (no terminal needed)
#
#  Oracle Cloud → Compute → Create instance → "Show advanced options" →
#  Management → "Paste cloud-init script" → paste this whole file.
#  Edit the four lines below first. The server installs everything on its
#  first boot (about 10–15 minutes), then keeps itself up to date from GitHub.
# ─────────────────────────────────────────────────────────────────────────────
REPO="https://github.com/suhmantics-droid/rishikesh.git"
GITHUB_TOKEN=""                       # only for a PRIVATE repo: a fine-grained token with read access to it
DOMAIN="rishikesh.suhmantics.com"
ADMIN_PASSWORD="change-this-to-something-long"
# ─────────────────────────────────────────────────────────────────────────────

# Log progress (not commands, so the password and token stay out of the log).
exec > /var/log/pinned-setup.log 2>&1
chmod 600 /var/log/pinned-setup.log
set -euo pipefail
step() { echo "$(date '+%H:%M:%S') ==> $*"; }
export DEBIAN_FRONTEND=noninteractive

step "swap"
# Swap: the build needs ~2 GB of memory and the smallest free servers have 1 GB.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "docker and git"
# Docker and git.
apt-get update -y
apt-get install -y git iptables-persistent
curl -fsSL https://get.docker.com | sh

step "firewall"
# Oracle's Ubuntu images block everything but SSH at the OS firewall: open web ports.
iptables -I INPUT 1 -p tcp --dport 80 -m state --state NEW -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 443 -m state --state NEW -j ACCEPT
netfilter-persistent save

step "download code"
# Code.
URL="$REPO"
[ -n "$GITHUB_TOKEN" ] && URL="${REPO/https:\/\//https://x-access-token:${GITHUB_TOKEN}@}"
git clone "$URL" /opt/pinned
cd /opt/pinned

step "settings"
# Settings. Everything else (WhatsApp number, API keys, payments) is set in /admin → Settings.
cat > .env <<ENV
DOMAIN=${DOMAIN}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SESSION_SECRET=$(openssl rand -hex 32)
ENV
chmod 600 .env
mkdir -p data && chown -R 1000:1000 data

step "build and start (the slow part)"
# Build and start. Caddy fetches the HTTPS certificate once DNS points here.
export GIT_SHA=$(git rev-parse --short HEAD)
docker compose up -d --build

# Nightly backup, and pick up new code from GitHub every 15 minutes.
cat > /etc/cron.d/pinned <<CRON
15 3 * * * root cd /opt/pinned && bash deploy/backup.sh >> /var/log/pinned-backup.log 2>&1
*/15 * * * * root cd /opt/pinned && bash deploy/auto-update.sh >> /var/log/pinned-update.log 2>&1
CRON

step "done — Pinned is running"

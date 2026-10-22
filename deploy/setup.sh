#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu 22.04/24.04 server (e.g. Oracle Cloud Always Free).
# Run from the project folder:   bash deploy/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/5 Swap (the build needs ~2 GB of memory; small free servers have 1 GB)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> 2/5 Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "==> 3/5 Open ports 80 and 443 on the server firewall"
# Oracle's Ubuntu images ship iptables rules that block everything except SSH.
if sudo iptables -L INPUT -n | grep -q "REJECT"; then
  sudo iptables -I INPUT 5 -p tcp --dport 80 -m state --state NEW -j ACCEPT || true
  sudo iptables -I INPUT 5 -p tcp --dport 443 -m state --state NEW -j ACCEPT || true
  sudo apt-get install -y iptables-persistent >/dev/null 2>&1 || true
  sudo netfilter-persistent save >/dev/null 2>&1 || true
fi
command -v ufw >/dev/null && sudo ufw status | grep -q active && sudo ufw allow 80,443/tcp || true

echo "==> 4/5 Settings (.env)"
if [ ! -f .env ]; then
  cp .env.example .env
  read -rp "Admin password for /admin: " ADMIN_PW
  read -rp "Your name (shown to organisers, optional): " OWNER
  read -rp "Your WhatsApp number with country code, e.g. +919876543210 (optional): " WA
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PW}|" .env
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^OWNER_NAME=.*|OWNER_NAME=${OWNER}|" .env
  sed -i "s|^OWNER_WHATSAPP=.*|OWNER_WHATSAPP=${WA}|" .env
  echo "   Saved .env — edit it later to add ANTHROPIC_API_KEY, RESEND_API_KEY, etc."
fi
mkdir -p data && sudo chown -R 1000:1000 data

echo "==> 5/5 Build and start (first build takes a few minutes)"
sudo docker compose up -d --build

# Nightly backup at 03:15 server time.
( crontab -l 2>/dev/null | grep -v deploy/backup.sh; echo "15 3 * * * cd $(pwd) && bash deploy/backup.sh >> deploy/backup.log 2>&1" ) | crontab -

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
echo
echo "Done. Once DNS points ${DOMAIN} at this server's IP, open https://${DOMAIN}"
echo "Admin: https://${DOMAIN}/admin"

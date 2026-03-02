#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash scripts/install-server.sh"
  exit 1
fi

echo "[1/6] Installing base tools..."
apt update
apt install -y curl git nginx certbot python3-certbot-nginx ufw

echo "[2/6] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "[3/6] Installing PM2..."
npm install -g pm2

echo "[4/6] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "[5/6] Enabling Nginx..."
systemctl enable nginx
systemctl restart nginx

echo "[6/6] Installing complete."
echo "Run certbot later: sudo certbot --nginx -d your-domain.com"

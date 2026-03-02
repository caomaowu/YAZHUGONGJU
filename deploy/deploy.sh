#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f ".env.prod" ]]; then
  echo "Missing .env.prod in ${ROOT_DIR}"
  exit 1
fi

set -a
source ".env.prod"
set +a

required_vars=("JWT_SECRET" "CORS_ORIGIN" "APP_DOMAIN")
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required env var in .env.prod: ${var_name}"
    exit 1
  fi
done

mkdir -p logs

echo "[1/6] Updating source..."
git pull --ff-only

echo "[2/6] Installing dependencies..."
npm ci

echo "[3/6] Building app..."
npm run build

echo "[4/6] Restarting PM2 app..."
pm2 startOrRestart ecosystem.config.cjs --env production --update-env
pm2 save

echo "[5/6] Health check: /api/health"
curl --fail --silent "http://127.0.0.1:${PORT:-3001}/api/health" > /dev/null

echo "[6/6] Health check: /"
curl --fail --silent "http://127.0.0.1:${PORT:-3001}/" > /dev/null

echo "Deploy completed successfully."

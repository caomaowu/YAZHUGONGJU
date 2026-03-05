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

wait_for_url() {
  local url="$1"
  local retries="${2:-20}"
  local delay="${3:-1}"

  for ((i=1; i<=retries; i++)); do
    if curl --fail --silent "$url" > /dev/null; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

echo "[1/6] Updating source..."
git pull --ff-only

echo "[2/6] Installing dependencies..."
npm ci --include=dev

echo "[3/6] Building app..."
npm run build

echo "[4/6] Restarting PM2 app..."
pm2 startOrRestart ecosystem.config.cjs --env production --update-env
pm2 save

echo "[5/6] Health check: /api/health"
wait_for_url "http://127.0.0.1:${PORT:-3001}/api/health"

echo "[6/6] Health check: /"
wait_for_url "http://127.0.0.1:${PORT:-3001}/"

echo "Deploy completed successfully."

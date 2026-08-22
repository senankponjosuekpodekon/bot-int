#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_USER_VAL="${DB_USER:-stiamond}"
DB_NAME_VAL="${DB_NAME:-stiamond_agent}"

echo "[setup] Step 1/5 — Installing dependencies..."
npm install

echo "[setup] Step 2/5 — Copying .env files if missing..."
if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "  Created .env from .env.example"
fi
if [ ! -f "$ROOT_DIR/apps/api/.env" ]; then
  cp "$ROOT_DIR/apps/api/.env.example" "$ROOT_DIR/apps/api/.env"
  echo "  Created apps/api/.env from .env.example"
fi

echo "[setup] Step 3/5 — Starting Postgres via Docker..."
docker compose up -d postgres

echo "[setup] Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U "$DB_USER_VAL" -d "$DB_NAME_VAL" >/dev/null 2>&1; then
    echo "  Postgres is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  ERROR: Postgres did not become ready in 30s."
    exit 1
  fi
  sleep 1
done

echo "[setup] Step 4/5 — Syncing database schema (dev mode)..."
cd "$ROOT_DIR/apps/api"
npx ts-node src/seed.ts

echo "[setup] Step 5/5 — Checking Ollama..."
if command -v ollama >/dev/null 2>&1; then
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "  Ollama is running."
  else
    echo "  Ollama installed but not running. Start it with: ollama serve"
  fi
else
  echo "  Ollama not found. Install from https://ollama.com or the AI chat will not work."
fi

echo ""
echo "[setup] ✅ Done!"
echo ""
echo "  Demo credentials:"
echo "    Email:    demo@stiamond.dev"
echo "    Password: Demo123!"
echo ""
echo "  Next: make dev   (starts API + Web)"
echo ""

#!/usr/bin/env bash
set -e

echo "[setup] Installing dependencies..."
npm install

echo "[setup] Starting Postgres & Ollama..."
docker compose up -d postgres

if command -v ollama >/dev/null 2>&1; then
  echo "[setup] Ollama found locally, skipping container."
else
  echo "[setup] Consider installing Ollama or starting the ollama service in docker compose."
fi

echo "[setup] Waiting for Postgres..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres -d stiamond_agent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[setup] Running database migrations..."
cd apps/api && npm run migration:run

echo "[setup] Done. Run 'make dev' to start the full stack."

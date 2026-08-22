.PHONY: setup dev stop test seed reset-db migrate-pgvector clean logs build lint help

help:
	@echo "Stiamond Bot-Int — Make targets:"
	@echo "  make setup     — Install deps, start Postgres, seed DB, check Ollama"
	@echo "  make dev       — Start API (port 3001) + Web (port 3000) in dev mode"
	@echo "  make stop      — Stop all Docker containers"
	@echo "  make test      — Run all unit tests (API + Web)"
	@echo "  make e2e       — Run Playwright E2E tests (requires running services)"
	@echo "  make seed      — Seed demo data (tenant, user, agents, leads, knowledge)"
	@echo "  make reset-db  — Wipe DB volume, restart Postgres, re-seed"
	@echo "  make migrate-pgvector — Run pgvector migration (vector column + index)"
	@echo "  make build     — Build all packages"
	@echo "  make lint      — Lint all packages"
	@echo "  make logs      — Tail Docker container logs"
	@echo "  make clean     — Stop containers + remove node_modules + dist"

setup:
	bash scripts/setup.sh

dev:
	@echo "Starting API and Web in dev mode..."
	npm run dev

stop:
	docker compose down

test:
	npm run test

e2e:
	cd apps/web && npx playwright test --reporter=list

seed:
	cd apps/api && npx ts-node src/seed.ts

reset-db:
	@echo "Wiping database volume..."
	docker compose down -v
	docker compose up -d postgres
	@echo "Waiting for Postgres..."
	@for i in $$(seq 1 30); do \
		if docker compose exec -T postgres pg_isready -U $${DB_USER:-stiamond} -d $${DB_NAME:-stiamond_agent} >/dev/null 2>&1; then \
			echo "  Postgres is ready."; break; \
		fi; \
		if [ $$i -eq 30 ]; then echo "  ERROR: Postgres timeout."; exit 1; fi; \
		sleep 1; \
	done
	cd apps/api && npx ts-node src/seed.ts

migrate-pgvector:
	@echo "Running pgvector migration..."
	docker compose exec -T postgres psql -U $${DB_USER:-stiamond} -d $${DB_NAME:-stiamond_agent} -f /dev/stdin < apps/api/src/migrations/pgvector-migration.sql

build:
	npm run build

lint:
	npm run lint

logs:
	docker compose logs -f

clean:
	docker compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/dist apps/*/.next
	@echo "Cleaned. Run 'make setup' to reinstall."

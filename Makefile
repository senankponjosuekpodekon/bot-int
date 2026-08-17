.PHONY: setup dev stop reset-db logs

setup:
	bash scripts/setup.sh

dev:
	docker compose up -d postgres ollama
	@echo "Waiting for Postgres..."
	@sleep 3
	cd apps/api && npm run migration:run
	npm run dev

stop:
	docker compose down

reset-db:
	docker compose down -v
	docker compose up -d postgres
	@sleep 3
	cd apps/api && npm run migration:run

logs:
	docker compose logs -f

.PHONY: setup-env install install-python dev-frontend dev-backend dev-backend-py \
	compose-up compose-down compose-logs typecheck test build

setup-env:
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; else echo ".env already exists"; fi

install:
	npm run install:all

install-python:
	python3 -m pip install -e ./backend_py[dev]

dev-frontend:
	npm run dev:frontend

dev-backend:
	npm run dev:backend

dev-backend-py:
	cd backend_py && python3 -m uvicorn app.main:app --host 0.0.0.0 --port $${APP_PORT:-8000} --reload

compose-up:
	docker compose up -d postgres redis backend_py_api backend_py_worker

compose-down:
	docker compose down

compose-logs:
	docker compose logs -f --tail=150 backend_py_api backend_py_worker postgres redis

typecheck:
	npm --prefix backend run typecheck

test:
	npm --prefix frontend run test
	npm --prefix backend run test

build:
	npm --prefix frontend run build
	npm --prefix backend run build

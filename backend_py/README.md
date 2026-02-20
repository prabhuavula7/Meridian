# Meridian AI Python Backend Scaffold

This directory contains the Phase 0A FastAPI scaffold for the Meridian AI Python backend.

Environment variables are sourced from the repository root `.env`.

## What is implemented

- FastAPI app bootstrap.
- JSON logging with request id propagation.
- Request id middleware with `X-Request-ID` support.
- Health endpoints with dependency checks:
  - `GET /health`
  - `GET /api/v1/health`
- Dependency checks for Postgres and Redis.

## Quickstart (uv)

```bash
cd backend_py
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Quickstart (pip)

```bash
cd backend_py
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment

```bash
# from repository root
cp .env.example .env
```

`DATABASE_URL` and `REDIS_URL` are optional for this scaffold. If absent, health checks return `skipped`.

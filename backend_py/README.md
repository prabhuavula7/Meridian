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
- Compatibility proxy endpoints (to legacy TypeScript backend):
  - `POST /api/v1/routes/enrich`
  - `POST /api/v1/analyze-supply-chain`
  - `GET /api/v1/analysis/health`
  - `GET /api/v1/analysis/stats`
- Ingestion endpoints:
  - `POST /api/v1/ingest/upload`
  - `GET /api/v1/ingest/uploads`
  - `GET /api/v1/ingest/uploads/{upload_id}`
  - `POST /api/v1/ingest/uploads/{upload_id}/normalize`
  - `GET /api/v1/ingest/uploads/{upload_id}/normalization`
- Dependency checks for Postgres and Redis.

## Quickstart (uv)

```bash
cd backend_py
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Set `LEGACY_BACKEND_BASE_URL` in root `.env` if the TypeScript backend runs on a non-default URL.

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

Ingestion settings in root `.env`:

- `UPLOAD_STORAGE_DIR`
- `UPLOAD_MANIFEST_PATH`
- `UPLOAD_MAX_BYTES`
- `UPLOAD_ALLOWED_EXTENSIONS`
- `SILVER_STORAGE_DIR`
- `QUARANTINE_STORAGE_DIR`
- `NORMALIZATION_REPORT_DIR`
- `NORMALIZATION_MAX_ERRORS`

Notes:

- Upload accepts CSV/XLSX/XLS for raw bronze ingestion.
- Phase 1B normalization currently supports CSV input for canonicalization and row-level quality reporting.

## Docker Compose

From repo root:

```bash
docker compose up -d postgres redis backend_py_api backend_py_worker
docker compose logs -f backend_py_api backend_py_worker
```

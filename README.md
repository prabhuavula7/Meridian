# Meridian AI

Meridian AI is a monorepo for supply-chain disruption intelligence. It combines a React frontend (dashboard, maps, charts, lane intelligence) with backend services for route enrichment, AI analysis, and the new Python migration scaffold.

## Architecture

- `frontend/` React (CRA) app with Tailwind, Radix UI primitives, Framer Motion, ECharts, TanStack Table, and `react-map-gl`.
- `backend/` Express + TypeScript API for:
  - route enrichment (`/api/v1/routes/enrich`)
  - AI analysis (`/api/v1/analyze-supply-chain`)
- `backend_py/` FastAPI scaffold (Phase 0A) with:
  - request-id middleware + JSON logging
  - dependency-aware health checks (`/health`, `/api/v1/health`)
  - compatibility proxy endpoints for gradual migration from `backend/`
- Root workspace scripts orchestrate frontend/backend via npm.

## Product Surfaces

- **Dashboard**: KPI cards, disruption feed, global map overlays, trend charts.
- **Insights**: filter panel, risk charts, lane table with sorting/pagination.
- **Disruption Detail**: focused incident map, timeline, impacted lanes, mitigation actions.
- **Data Upload**: CSV/XLS/XLSX ingest + field mapping/validation.
- **OpenAI Config**: API key setup and connection test.

## API Endpoints

Base URL: `http://localhost:5050/api/v1`

- `POST /analyze-supply-chain`
- `POST /routes/enrich`
- `GET /analysis/health`
- `GET /analysis/stats`
- `GET /health` (server)

## Prerequisites

- Node.js 18+
- npm 10+
- Python 3.11+ (for `backend_py`)

## Package Manager Policy

This repo is **npm-only**.

- Do not use `yarn` or `pnpm` here.
- Lockfiles are npm lockfiles (`package-lock.json`) at root, frontend, and backend.

## Environment Policy

This repo is **root `.env` only**.

- Use `/.env` as the single source of truth for frontend, `backend/`, and `backend_py/`.
- Do not maintain separate `frontend/.env`, `backend/.env`, or `backend_py/.env` files.

## Setup

### 1) Install dependencies

```bash
npm run install:all
```

### 2) Environment files

```bash
npm run setup:env
```

Minimum recommended values:

- `REACT_APP_API_BASE_URL=http://localhost:5050/api/v1`
- `REACT_APP_MAPBOX_ACCESS_TOKEN=...` (recommended for map rendering)
- `OPENAI_API_KEY=...`
- `LEGACY_BACKEND_BASE_URL=http://localhost:5050/api/v1` (for backend_py compatibility proxy)

## Run Locally

Use two terminals:

Terminal 1 (backend):
```bash
npm run dev:backend
```

Terminal 2 (frontend):
```bash
npm run dev:frontend
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:5050`

## Python Backend Scaffold (Phase 0A)

Run in a separate terminal:

```bash
cd backend_py
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health endpoints:

- `http://localhost:8000/health`
- `http://localhost:8000/api/v1/health`

Compatibility proxy endpoints (served by backend_py):

- `POST http://localhost:8000/api/v1/routes/enrich`
- `POST http://localhost:8000/api/v1/analyze-supply-chain`
- `GET http://localhost:8000/api/v1/analysis/health`
- `GET http://localhost:8000/api/v1/analysis/stats`

## Foundation Compose Stack

```bash
npm run compose:up
npm run compose:logs
```

Services:

- `postgres` (default port `5432`)
- `redis` (default port `6379`)
- `backend_py_api` (default port `8000`)
- `backend_py_worker` (background heartbeat worker)

## Build and Test

```bash
npm run build
npm test
```

## Quick Validation Checklist

1. Open `http://localhost:3000`.
2. Toggle light/dark theme and refresh (theme persists).
3. Upload sample data and verify Dashboard KPIs/charts render.
4. Confirm map renders (if not, set `REACT_APP_MAPBOX_ACCESS_TOKEN` in root `.env` and restart frontend).
5. Open Insights and verify filter + lane table interactions.
6. Open Disruption Detail and verify timeline/action dialog behavior.

## Legacy Cleanup Notes

Legacy frontend modules from earlier map/analysis implementations were removed from active codepaths to keep the current Meridian AI shell and design system maintainable.

## Scripts

Root:

- `npm run install:all`
- `npm run setup:env`
- `npm run dev:frontend`
- `npm run dev:backend`
- `npm run build`
- `npm test`
- `npm run compose:up`
- `npm run compose:down`
- `npm run compose:logs`

Backend:

- `npm --prefix backend start`
- `npm --prefix backend run build`

Frontend:

- `npm --prefix frontend start`
- `npm --prefix frontend run build`

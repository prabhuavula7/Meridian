# Supply Chain AI

Supply Chain AI is a monorepo application for uploading supply chain data, enriching routes, visualizing global logistics flows, and generating AI-driven risk analysis.

The stack is intentionally split:

- `frontend/`: React (CRA) client for upload, map visualization, filtering, and analysis UI
- `backend/`: Express + TypeScript API for route enrichment and AI analysis orchestration

## What It Does

- Upload CSV/XLS/XLSX supply chain datasets
- Auto-detect/normalize key route fields (origin, destination, mode, lead time, product/cost/quantity)
- Enrich routes with map-ready geometry and hub resolution (airports, ports, city centers)
- Render mode-aware routes (air/sea/road/rail/multimodal) with risk-aware styling
- Handle mixed-route segmentation (`access`, `main`, `egress`) for clearer UX
- Provide AI analysis of disruptions, impact, and mitigation strategy
- Export the analysis view as a full-page PDF using browser print

## Key Behaviors (Current)

### Routing and Map Behavior

- `air` routes: great-circle geometry between resolved airport hubs
- `sea` routes: maritime corridor graph geometry between resolved ports
- `road` / `rail` routes:
- OSRM is attempted first when appropriate
- If OSRM is unavailable, land-corridor fallback is used (where feasible)
- If a pure ground route is not feasible across disconnected landmasses, backend auto-converts to mixed routing (`road + sea + road`) instead of drawing fake road/rail over oceans
- Pacific wrap rendering: frontend splits polylines on the antimeridian (`±180`) so trans-Pacific routes flow across map edges instead of long U-turn artifacts

### Performance and Stability

- Backend route enrichment uses in-memory payload caching
- Frontend caches repeated enrichment/analysis requests in-memory per session
- Route rendering uses geometry simplification and mode filters to remain usable on larger datasets

## Repository Layout

- `frontend/` React app (JavaScript + Tailwind + Leaflet)
- `backend/` Express API (TypeScript)
- `scripts/dev.sh` helper (`frontend` or `backend`)
- `package.json` root scripts for install/build/run
- `supply_chain_data.csv` local sample dataset in repo root

## Prerequisites

- Node.js 18+
- npm 9+
- macOS/Linux/Windows shell with standard `npm` workflow

## Environment Setup

1. Frontend env

```bash
cp frontend/.env.example frontend/.env
```

2. Backend env

```bash
cp backend/.env.example backend/.env
```

3. Set OpenAI key

- Preferred: `backend/.env` with `OPENAI_API_KEY=...`
- Optional fallback: `frontend/.env` with `REACT_APP_OPENAI_API_KEY=...`

Default local ports:

- Frontend: `3000`
- Backend: `5050`

## Install

```bash
npm run install:all
```

## Run (Separate Terminals Recommended)

Terminal 1:
```bash
cd backend
npm start
```

Terminal 2:
```bash
cd frontend
npm start
```

Equivalent root commands:
```bash
npm run start:backend
npm start
```

Optional helper script:
```bash
./scripts/dev.sh backend
./scripts/dev.sh frontend
```

Hot reload:
- Backend: `nodemon` watches `backend/src/**/*.ts`
- Frontend: CRA fast refresh watches `frontend/src/**/*`
- Browser auto-open is disabled intentionally; open `http://localhost:3000` manually

## Build

```bash
npm run build
```

## Smoke Checks

Backend health:
```bash
curl http://localhost:5050/health
```

Analysis health:
```bash
curl http://localhost:5050/api/v1/analysis/health
```

Route enrichment check:
```bash
curl -X POST http://localhost:5050/api/v1/routes/enrich \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"origin_location":"Los Angeles","destination_location":"Singapore","mode_of_transport":"sea"}]}'
```

## Data Requirements

### Minimum Required Fields for Reliable Flow

- `origin_location`
- `destination_location`
- `mode_of_transport`
- `lead_time`
- `product_name`
- `product_cost`
- `quantity`

Recommended extras:
- `sku`
- `product_category`
- `supplier`
- `route`

### `supply_chain_data.csv` in This Repo

As-is, it does not fully satisfy backend analysis requirements because it lacks a direct destination-equivalent field in canonical shape.

Suggested mapping:
- `Location` -> `origin_location`
- `Transportation modes` -> `mode_of_transport`
- `Lead time` / `Lead times` -> `lead_time`
- `Costs` / `Price` -> `product_cost`
- `Order quantities` / `Number of products sold` -> `quantity`
- `SKU` -> `sku`
- `Product type` -> `product_category`
- Add `product_name`
- Add `destination_location` (required)

### Fast Normalization Example

Run in repo root to create `supply_chain_data.normalized.csv`:

```bash
python3 - <<'PY'
import csv

route_to_destination = {
    "Route A": "Delhi",
    "Route B": "Mumbai",
    "Route C": "Chennai",
}

src = "supply_chain_data.csv"
dst = "supply_chain_data.normalized.csv"

with open(src, newline="", encoding="utf-8-sig") as f_in, open(dst, "w", newline="", encoding="utf-8") as f_out:
    reader = csv.DictReader(f_in)
    fieldnames = [
        "origin_location",
        "destination_location",
        "mode_of_transport",
        "lead_time",
        "product_name",
        "product_cost",
        "quantity",
        "sku",
        "product_category",
        "supplier",
        "route",
    ]
    writer = csv.DictWriter(f_out, fieldnames=fieldnames)
    writer.writeheader()

    for row in reader:
        route = (row.get("Routes") or "").strip()
        sku = (row.get("SKU") or "").strip()
        ptype = (row.get("Product type") or "").strip()
        writer.writerow({
            "origin_location": (row.get("Location") or "").strip(),
            "destination_location": route_to_destination.get(route, "Kolkata"),
            "mode_of_transport": (row.get("Transportation modes") or "").strip(),
            "lead_time": (row.get("Lead time") or row.get("Lead times") or "").strip(),
            "product_name": f"{ptype} {sku}".strip(),
            "product_cost": (row.get("Costs") or row.get("Price") or "").strip(),
            "quantity": (row.get("Order quantities") or row.get("Number of products sold") or "").strip(),
            "sku": sku,
            "product_category": ptype,
            "supplier": (row.get("Supplier name") or "").strip(),
            "route": route,
        })

print(f"Written: {dst}")
PY
```

## Analysis Report PDF Export

- Go to `AI Analysis` tab
- Click `Download Full Report (PDF)`
- Browser print opens; choose `Save as PDF`

Removed actions:
- `Share Analysis`
- `Schedule Follow-up`

## Configuration and Tuning

### Common Backend Routing/Enrichment Variables

- `ROUTE_ENRICH_CONCURRENCY=4`
- `ROUTE_HTTP_TIMEOUT_MS=15000`
- `MAX_OSRM_CONNECTOR_DISTANCE_KM=1200`
- `MAX_OSRM_LAND_DISTANCE_KM=3500`
- `MAX_OSRM_RAIL_DISTANCE_KM=2800`

### Logging

- Frontend verbose logs: `REACT_APP_DEBUG_LOGS=true`
- Backend verbose logs: `DEBUG_LOGS=true`

## Troubleshooting

### Map Lines Look Wrong Across Pacific

- Ensure frontend is refreshed after latest code
- Antimeridian splitting is implemented in frontend route rendering; stale cached route responses may still show older geometry if app session is old
- Hard refresh frontend or restart frontend process

### Backend Shows Geocoder/OSRM Warnings

- Warnings do not always indicate failure; backend falls back to deterministic geometry
- If warnings are frequent, reduce concurrency and/or increase timeout in backend env

### OpenAI Analysis Not Working

- Ensure `OPENAI_API_KEY` exists in `backend/.env`
- Backend can start without key in dev mode, but analysis endpoint will reject requests without valid key

## Notes

- Backend dev entrypoint is `backend/src/server.ts` (`npm start`)
- Backend production start is `npm run start:prod` (requires `npm run build` first)
- Frontend uses `lucide-react` icon set
- Route enrichment endpoint: `POST /api/v1/routes/enrich`
- Analysis endpoint: `POST /api/v1/analyze-supply-chain`
- Generated artifacts and local env files are ignored via `.gitignore`

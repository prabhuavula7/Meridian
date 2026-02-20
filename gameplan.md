# BentTech.AI Supply Chain Intelligence Platform: End-to-End Build Gameplan

## 1. Document Purpose

This document is the master execution blueprint for turning the current repository into a full AI-powered supply chain product MVP that can scale into a production-grade platform.

It is intentionally detailed so that future AI coding agents and human contributors can implement features with consistent architecture, data contracts, model governance, and delivery sequencing.

## 2. Product Vision

Build a multimodal supply chain intelligence system that can:

1. Ingest messy real-world operational data from CSV, ERP exports, spreadsheets, APIs, and events.
2. Normalize and unify data into canonical shipment-route-event entities.
3. Generate and visualize accurate route paths for road, rail, sea, and air.
4. Forecast demand, delays, costs, and risk for lanes and shipments.
5. Optimize routing and mode mix under constraints.
6. Run what-if simulations and scenario stress testing.
7. Provide an explainable AI copilot for analysts and planners.
8. Trigger alerts and recommended actions in near real time.
9. Support robust experimentation, monitoring, and model lifecycle operations.
10. Operate on a student-friendly budget with open-source-first components.

## 3. Guiding Principles

### 3.1 Build Principles

- Open-source first, paid service optional.
- Keep architecture modular and replaceable.
- Preserve deterministic pipelines and reproducibility.
- Prefer explicit data contracts over implicit assumptions.
- Prefer asynchronous processing for heavy route/model workloads.
- Design for observability from day one.
- Separate online API serving from offline model training.
- Start with correctness and explainability, then optimize speed.

### 3.2 Student Budget Principles

- Use free tiers and self-host options by default.
- Avoid managed enterprise tooling in first 2 phases.
- Use local-first development with Docker Compose.
- Keep cloud spend optional and event-driven.

## 4. Ten Capability Targets (The Ten Points)

1. Canonical ingestion and data quality pipeline.
2. Geocoding and facility/port/airport reference intelligence.
3. Accurate multimodal routing engine (road, rail, sea, air).
4. Risk engine with route-segment-level scoring.
5. Forecasting engine (demand, delay, cost, SLA breach probability).
6. Optimization engine (cost, time, risk, emissions objective tradeoff).
7. Scenario simulation and what-if planner.
8. AI copilot/chatbot with retrieval and structured tools.
9. MLOps, evaluation, and observability stack.
10. Production-ready platform hardening (security, CI/CD, docs, runbooks).

## 5. Current State to Target State

### 5.1 Current State Snapshot

- Frontend: React app with map visualization and upload workflow.
- Backend: Existing service logic split from earlier Node/TS implementation.
- Route logic: currently mixed quality for long-haul routing and mode-specific handling.
- Data ingestion: CSV-heavy and semi-manual mapping.
- Model stack: limited analytical intelligence and no full ML lifecycle.

### 5.2 Target State Snapshot

- Backend migrated to Python service layer (FastAPI + workers) while preserving frontend compatibility.
- Canonical data model in Postgres/Parquet with bronze/silver/gold layers.
- Dedicated routing microservice abstraction with mode-specific engines.
- Feature store-like curated training sets.
- Forecasting + optimization + simulation services exposed via APIs.
- Agentic AI copilot connected to SQL, route, and forecast tools.
- Fully instrumented platform with quality metrics and model drift checks.

## 6. Target Architecture

## 6.1 Logical Architecture

- `frontend/`:
  - React UI for uploads, data mapping, map rendering, risk/forecast dashboards, what-if builder, and copilot chat.
- `backend_py/` (new Python backend):
  - FastAPI app for synchronous APIs.
  - Background worker for heavy compute tasks.
  - Data pipeline package for cleaning/normalization/enrichment.
  - ML package for training and serving.
  - Optimization and simulation package.
- `data/`:
  - Bronze raw files.
  - Silver cleaned normalized datasets.
  - Gold analytics-ready and model-ready datasets.
- `infra/`:
  - Docker Compose, local observability, migration scripts.
- `notebooks/`:
  - Controlled exploration only; production logic must migrate to packages.

## 6.2 Suggested Repository Layout

```text
.
├─ frontend/
├─ backend/                    # existing TS backend, retained during migration window
├─ backend_py/                 # new Python production backend
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ v1/
│  │  │  │  ├─ ingest.py
│  │  │  │  ├─ routes.py
│  │  │  │  ├─ forecast.py
│  │  │  │  ├─ optimize.py
│  │  │  │  ├─ scenario.py
│  │  │  │  ├─ copilot.py
│  │  │  │  └─ admin.py
│  │  ├─ core/
│  │  │  ├─ config.py
│  │  │  ├─ logging.py
│  │  │  ├─ security.py
│  │  │  └─ dependencies.py
│  │  ├─ domain/
│  │  │  ├─ entities.py
│  │  │  ├─ enums.py
│  │  │  └─ schemas.py
│  │  ├─ services/
│  │  │  ├─ ingestion/
│  │  │  ├─ geospatial/
│  │  │  ├─ routing/
│  │  │  ├─ risk/
│  │  │  ├─ forecasting/
│  │  │  ├─ optimization/
│  │  │  ├─ simulation/
│  │  │  ├─ copilot/
│  │  │  └─ reporting/
│  │  ├─ storage/
│  │  │  ├─ db.py
│  │  │  ├─ cache.py
│  │  │  ├─ object_store.py
│  │  │  └─ repositories/
│  │  └─ workers/
│  │     ├─ celery_app.py
│  │     └─ tasks/
│  ├─ tests/
│  ├─ pyproject.toml
│  └─ Dockerfile
├─ data/
│  ├─ bronze/
│  ├─ silver/
│  ├─ gold/
│  └─ dictionaries/
├─ docs/
│  ├─ architecture/
│  ├─ data-contracts/
│  ├─ api/
│  ├─ runbooks/
│  └─ model-cards/
├─ infra/
│  ├─ compose/
│  ├─ migrations/
│  └─ monitoring/
└─ gameplan.md
```

## 6.3 Migration Strategy

- Keep existing frontend stable.
- Build new Python backend in parallel.
- Provide compatibility endpoints matching existing frontend contract.
- Switch frontend API base URL by environment variable.
- Retire old backend once parity tests pass.

## 7. Technology Stack (Free/Low-Cost First)

## 7.1 Backend and APIs

- Framework: FastAPI.
- Validation: Pydantic v2.
- ASGI server: Uvicorn + Gunicorn for production.
- Background jobs: Celery + Redis (or RQ + Redis for simpler setup).
- API docs: OpenAPI auto docs + curated markdown docs.

## 7.2 Data and Storage

- Primary OLTP: PostgreSQL.
- Analytical local processing: DuckDB + Parquet.
- Caching: Redis.
- File/object store:
  - Local dev: filesystem.
  - Optional cloud: MinIO or S3-compatible bucket.

## 7.3 Data Quality and Validation

- Schema validation: Pandera + Pydantic.
- Data quality tests: Great Expectations.
- Unit quality checks: custom rule engine + SQL checks.

## 7.4 ML and Forecasting

- Baseline forecasting: StatsForecast (fast classical baselines).
- Advanced forecasting: LightGBM/XGBoost and optional Temporal Fusion Transformer.
- Experiment tracking: MLflow.
- Data/model versioning: DVC + git.
- Feature processing: scikit-learn pipelines.

## 7.5 Optimization and Simulation

- Solver: Google OR-Tools (CP-SAT + routing solver).
- LP/MIP fallback: PuLP or Pyomo.
- Network operations: NetworkX.
- Simulation: SimPy for discrete event simulation.

## 7.6 Geospatial and Routing

- Geocoding:
  - Primary: Nominatim (respect usage policy and throttle).
  - Secondary: Photon / Pelias instance.
  - Fallback dictionaries for known facilities.
- Road routing:
  - OSRM public in dev, self-host OSRM for reliability.
  - Valhalla optional for multimodal flexibility.
- Rail routing:
  - OSM rail graph extraction + custom graph edges.
  - Optional GTFS and rail corridor data if available.
- Sea routing:
  - Searoute graph datasets or custom maritime graph with waypoints.
  - Chokepoint logic for Panama, Suez, Malacca, Bab el-Mandeb, Gibraltar.
- Air routing:
  - OpenFlights airport dataset + great-circle route approximation.

## 7.7 AI Copilot

- LLM orchestration: LangGraph or lightweight function router.
- Retrieval: LlamaIndex or LangChain with clear boundaries.
- Vector DB: Qdrant local/self-host.
- Embeddings:
  - Local: BGE family via sentence-transformers.
  - API optional: OpenAI embeddings.
- Model serving options:
  - Ollama local models for cost control.
  - Hosted API model as optional fallback.

## 7.8 Observability

- Logging: Structlog + JSON logs.
- Metrics: Prometheus.
- Dashboards: Grafana.
- Traces: OpenTelemetry + Jaeger/Tempo.
- Error tracking: Sentry free tier optional.

## 7.9 CI/CD

- GitHub Actions:
  - lint
  - test
  - build
  - smoke integration
- Pre-commit hooks for quality.

## 8. Data Model and Contracts

## 8.1 Core Entities

- `shipment`
- `route_plan`
- `route_leg`
- `facility`
- `location`
- `carrier`
- `event`
- `cost_record`
- `risk_signal`
- `forecast_snapshot`
- `scenario`

## 8.2 Canonical Shipment Schema

Required fields:

- `shipment_id` (string, unique stable id)
- `order_id` (string)
- `origin_name` (string)
- `destination_name` (string)
- `origin_country` (string)
- `destination_country` (string)
- `planned_departure_ts` (timestamp)
- `planned_arrival_ts` (timestamp)
- `mode` (enum: road/rail/sea/air/multimodal)
- `weight_kg` (float)
- `volume_cbm` (float)
- `cost_usd` (float)
- `priority` (enum)

Optional fields:

- `carrier_name`
- `incoterm`
- `commodity`
- `container_type`
- `hazmat_flag`
- `temperature_control_flag`

## 8.3 Canonical Route Leg Schema

- `leg_id`
- `shipment_id`
- `sequence_no`
- `mode`
- `from_location_id`
- `to_location_id`
- `from_lat`
- `from_lon`
- `to_lat`
- `to_lon`
- `path_geometry_wkt` or polyline
- `distance_km`
- `planned_duration_hr`
- `actual_duration_hr`
- `risk_score`
- `co2_kg`

## 8.4 Facility Reference Schema

- `facility_id`
- `facility_name`
- `facility_type` (warehouse/port/airport/rail_terminal/city_hub)
- `unlocode`
- `iata_code`
- `icao_code`
- `lat`
- `lon`
- `country`
- `city`
- `confidence`
- `source`

## 8.5 Risk Signal Schema

- `signal_id`
- `signal_type` (weather/political/port_congestion/strike/custom)
- `region`
- `severity`
- `start_ts`
- `end_ts`
- `geojson_region`
- `source`
- `ingestion_ts`

## 8.6 Data Contracts and Versioning

- Define versioned contracts under `docs/data-contracts/v{n}.md`.
- Validate all inbound data against contract version.
- Enforce backward compatibility rules.
- Track contract evolution in changelog.

## 9. Data Ingestion and Normalization Pipeline

## 9.1 Pipeline Layers

- Bronze:
  - Raw files as received.
  - Immutable and timestamped.
  - Store source metadata and hash.
- Silver:
  - Cleaned and normalized records.
  - Standardized field names, types, units.
  - Deduplicated and validated.
- Gold:
  - Analytics-ready tables.
  - ML feature tables.
  - KPI aggregates.

## 9.2 Ingestion Sources

- CSV upload via frontend.
- Excel upload.
- Scheduled pull from REST APIs.
- Optional message queue streams.
- Manual reference dictionaries for facilities.

## 9.3 Normalization Rules

- Datetime normalization to UTC.
- Country normalization to ISO-3166.
- Currency conversion to USD baseline.
- Weight and volume conversion to SI units.
- Categorical normalization for mode and priority.
- String cleanup:
  - trim spaces
  - unify case
  - remove control characters
  - normalize unicode when needed

## 9.4 Record Linkage and Dedup

- Primary key matching by `shipment_id`.
- Fuzzy fallback by order_id + timestamps + endpoints.
- Use deterministic hash fingerprint for duplicates.
- Mark records with lineage metadata.

## 9.5 Data Quality Checks

- Null checks for required fields.
- Type checks for numeric/date fields.
- Range checks:
  - duration >= 0
  - distance >= 0
  - weight/volume realistic bounds
- Domain checks for mode enums.
- Geo checks for valid lat/lon ranges.
- Temporal checks:
  - departure <= arrival
  - event timestamps within route timeline

## 9.6 Quarantine and Feedback Loop

- Invalid rows sent to quarantine table.
- Each invalid row has machine-readable error code.
- Frontend shows row-level remediation suggestions.
- Corrected rows can be resubmitted.

## 9.7 Caching Strategy for Repeated Files

- Compute file hash (SHA-256) at upload.
- If hash + mapping config unchanged, reuse prior outputs.
- Cache artifacts:
  - normalized rows
  - geocoding resolution
  - route geometry
  - forecast outputs
- Cache TTL configurable by environment.

## 9.8 Pipeline Orchestration

- Trigger ingestion job on upload.
- Break into tasks:
  - parse
  - validate
  - normalize
  - enrich
  - route
  - risk
  - aggregate
- Each task writes status updates for progress UI.

## 10. Geospatial and Routing Engine (Multimodal Accuracy)

## 10.1 Core Design

- Create unified `RouteEngine` interface:
  - `build_route(request) -> RouteResponse`
- Implement mode-specific providers:
  - `AirRouteProvider`
  - `SeaRouteProvider`
  - `RoadRouteProvider`
  - `RailRouteProvider`
  - `MultimodalComposer`

## 10.2 Location Resolution

- Resolve origin and destination based on mode:
  - Air: nearest major airport to city/facility.
  - Sea: nearest viable commercial port.
  - Rail: nearest rail terminal or city rail node.
  - Road: city center or specified facility coordinate.
- Confidence scoring for each resolution.
- Persist chosen nodes and alternatives.

## 10.3 Air Routing

- Use great-circle distance between airport nodes.
- Optional no-fly or geopolitical constraints as penalties.
- Generate visually smooth arc respecting antimeridian split.

## 10.4 Sea Routing

- Build maritime graph from known sea lanes and chokepoints.
- Route via Dijkstra/A* over maritime edges.
- Enforce water-only edges unless multimodal requested.
- Support canal/strait constraints.
- Include penalties for known congestion regions.

## 10.5 Road Routing

- Route using OSRM/Valhalla road network.
- Snap points to drivable roads.
- Retry with nearest valid road node if initial node fails.

## 10.6 Rail Routing

- Build graph from OSM railways and terminals.
- Use rail-only edges for rail mode.
- Add intermodal connectors only in multimodal mode.

## 10.7 Multimodal Composition

- If mode is explicit single-mode:
  - keep single-mode path only.
- If mode is multimodal:
  - create segment candidates.
  - optimize segment sequence for objective.
- Segment metadata includes mode and transfer points.

## 10.8 Antimeridian and Pacific Crossing Handling

- Normalize longitudes.
- Split lines crossing +/-180 into two render-safe polylines.
- Render wrapped routes to avoid U-turn artifacts.
- Keep canonical geometry and map-render geometry separately.

## 10.9 Validation Rules for Route Correctness

- Sea route cannot traverse land polygons.
- Air route should not be constrained by road/rail edges.
- Road/rail route should avoid open ocean except on known ferry/bridge links.
- Multimodal route must annotate each segment mode.

## 10.10 Route Engine Output Contract

- `route_id`
- `shipment_id`
- `segments[]`
  - `segment_id`
  - `mode`
  - `from_node`
  - `to_node`
  - `geometry`
  - `distance_km`
  - `duration_hr`
  - `risk_score`
  - `quality_flags`
- `total_distance_km`
- `total_duration_hr`
- `route_quality_score`

## 11. Risk Intelligence Engine

## 11.1 Objective

Generate interpretable risk scores at shipment, lane, and route-segment levels.

## 11.2 Risk Inputs

- Historical delay patterns.
- Port/airport congestion signals.
- Weather hazards.
- Geopolitical incidents.
- Carrier reliability.
- Customs delay propensity.
- Route complexity and transfer count.

## 11.3 Risk Scoring Design

- Hybrid scoring:
  - Rule-based baseline.
  - ML-based probability calibration.
- Segment-level score aggregated to route score.
- Explainability fields:
  - top contributing factors.
  - confidence interval.

## 11.4 Output

- `risk_score` (0-100)
- `risk_tier` (low/medium/high/critical)
- `risk_factors[]`
- `recommended_actions[]`

## 11.5 Low-Risk Visualization Rule

- Routes marked low risk rendered in muted gray with lower opacity.
- Maintain mode color in tooltip/detail panel to avoid ambiguity.

## 12. Forecasting Engine

## 12.1 Forecast Targets

- Demand volume by lane/time bucket.
- ETA delay probability.
- Cost variance forecast.
- SLA breach probability.
- Capacity utilization forecast.

## 12.2 Forecasting Strategy

- Stage 1 baseline:
  - seasonal naive
  - moving average
  - ETS/ARIMA
- Stage 2 boosted trees with engineered features.
- Stage 3 deep sequence models where data volume justifies.

## 12.3 Feature Set

- Time features:
  - day-of-week
  - week-of-year
  - holiday flags
- Lane features:
  - origin-destination pair
  - mode
  - transfer count
- Operational features:
  - carrier
  - equipment type
  - congestion indicators
- External features:
  - weather severity
  - fuel proxies

## 12.4 Model Training Pipeline

- Dataset cut by snapshot date.
- Train/validation/test split using temporal ordering.
- Backtesting windows for each forecast horizon.
- Store metrics and artifacts in MLflow.

## 12.5 Model Evaluation Metrics

- Demand: MAE, MAPE, WAPE.
- Delay classification: ROC-AUC, PR-AUC, Brier score.
- Cost prediction: RMSE, MAE.
- Calibration checks for probabilities.

## 12.6 Serving

- Batch forecasts generated daily/hourly.
- Real-time inference for individual shipments on demand.
- Drift checks trigger retraining recommendations.

## 13. Optimization Engine

## 13.1 Objective

Recommend best route/mode decisions under constraints.

## 13.2 Decision Variables

- mode selection
- path selection
- carrier assignment
- departure window
- transfer point selection

## 13.3 Constraints

- delivery SLA
- max budget
- capacity limits
- regulatory constraints
- hazardous goods restrictions
- emissions caps

## 13.4 Objective Function

Weighted multi-objective optimization:

- minimize cost
- minimize transit time
- minimize risk
- minimize emissions

Expose adjustable weight sliders in UI.

## 13.5 Solver Strategy

- OR-Tools for combinatorial routing/scheduling.
- Pyomo/PuLP for LP/MIP formulations.
- Heuristic fallback for large instances.

## 13.6 Explainability

- Provide why chosen route won.
- Show tradeoff deltas against second-best option.
- Emit infeasibility diagnostics when no solution exists.

## 14. Scenario Simulation and What-If Analysis

## 14.1 Scenario Types

- Port closure.
- Airport disruption.
- Rail strike.
- Fuel cost shock.
- Capacity reduction.
- Demand surge.
- Customs delay increase.

## 14.2 Simulation Engine

- SimPy discrete event simulation.
- Time-based events and queues.
- Entity states:
  - pending
  - in transit
  - delayed
  - delivered

## 14.3 Scenario Workflow

- Clone baseline plan.
- Apply intervention or disruption parameters.
- Simulate over horizon.
- Compare KPI deltas vs baseline.

## 14.4 Scenario Outputs

- service level change
- total cost change
- average delay change
- mode mix shift
- lane congestion impact

## 15. AI Copilot and Chatbot

## 15.1 Core Use Cases

- Ask natural language questions about shipments and risk.
- Generate summary reports from current dataset.
- Recommend mitigation actions.
- Explain forecast and optimization results.
- Build what-if scenario from chat prompts.

## 15.2 Architecture

- RAG over:
  - runbooks
  - model cards
  - data dictionary
  - analysis snapshots
- Tool calling layer:
  - SQL query tool
  - route recompute tool
  - forecast tool
  - optimization tool
  - scenario tool

## 15.3 Guardrails

- Role-based access controls.
- SQL allowlist and query timeout.
- Output schema constraints for actions.
- Citation and evidence links in responses.

## 15.4 Model Strategy (Budget-Aware)

- Default local or low-cost model for routine tasks.
- Fallback to stronger hosted model for complex reasoning.
- Route requests by complexity classifier.

## 16. Model Governance and MLOps

## 16.1 Experiment Tracking

- Track params, metrics, datasets, code versions with MLflow.

## 16.2 Model Registry

- Stage lifecycle:
  - candidate
  - staging
  - production
  - archived

## 16.3 Reproducibility

- Lock dependency versions.
- Version datasets with DVC.
- Save training configs and seeds.

## 16.4 Monitoring

- Data drift metrics.
- Concept drift checks.
- Prediction quality decay alerts.
- Latency and failure rates.

## 16.5 Retraining Policy

- Scheduled retraining by cadence.
- Event-driven retraining on drift threshold breach.

## 17. Platform APIs (Python Backend)

## 17.1 Ingestion APIs

- `POST /api/v1/ingest/upload`
- `POST /api/v1/ingest/validate`
- `POST /api/v1/ingest/normalize`
- `GET /api/v1/ingest/jobs/{job_id}`

## 17.2 Geospatial/Routing APIs

- `POST /api/v1/routes/enrich`
- `POST /api/v1/routes/compute`
- `POST /api/v1/routes/validate`
- `GET /api/v1/routes/{route_id}`

## 17.3 Risk APIs

- `POST /api/v1/risk/score`
- `GET /api/v1/risk/shipment/{shipment_id}`

## 17.4 Forecast APIs

- `POST /api/v1/forecast/run`
- `GET /api/v1/forecast/{entity_id}`
- `GET /api/v1/forecast/metrics/{model_id}`

## 17.5 Optimization APIs

- `POST /api/v1/optimize/plan`
- `POST /api/v1/optimize/compare`

## 17.6 Scenario APIs

- `POST /api/v1/scenario/create`
- `POST /api/v1/scenario/run`
- `GET /api/v1/scenario/{scenario_id}/results`

## 17.7 Copilot APIs

- `POST /api/v1/copilot/chat`
- `POST /api/v1/copilot/action`

## 18. Frontend Evolution Plan

## 18.1 UX Modules

- Upload and mapping wizard.
- Data quality report panel.
- Map with mode filters and route hover details.
- Risk and forecast dashboard.
- Optimization comparison board.
- Scenario studio.
- Copilot panel.

## 18.2 Map Rendering for Scale

- Keep Leaflet for short term.
- Introduce MapLibre GL or deck.gl for 1k+ routes.
- Use line simplification and progressive rendering.
- Use viewport culling and clustering for point layers.

## 18.3 Route Visualization Rules

- Distinct fixed colors per mode.
- Hover tooltip shows segment mode and metrics.
- Low-risk routes: gray + reduced opacity.
- Segment-level rendering for multimodal paths.
- Antimeridian-safe rendering for Pacific crossings.

## 18.4 Performance Targets

- 1000 routes render within acceptable interaction latency.
- Zoom/pan remains smooth under tested dataset sizes.
- Filtering response time under 300ms for cached state.

## 19. Security and Compliance Baseline

## 19.1 Core Controls

- Secrets from environment only.
- No API keys in frontend bundle.
- JWT-based auth for protected endpoints.
- Rate limiting and abuse controls.
- Input sanitization and payload limits.

## 19.2 Data Protection

- Encrypt secrets and sensitive config.
- Mask PII in logs.
- Access-controlled data exports.

## 19.3 Auditability

- Request IDs for all API requests.
- Structured audit logs for user actions.

## 20. Observability Plan

## 20.1 Logs

- Correlated request IDs across frontend and backend.
- Job-level logs for pipeline tasks.
- Mode-specific route provider diagnostics.

## 20.2 Metrics

- Ingestion success rate.
- Geocoding hit rate and fallback rate.
- Route generation success rate by mode.
- Forecast error metrics over time.
- Optimization solve time and feasibility rate.

## 20.3 Alerting

- Queue backlog thresholds.
- API error spikes.
- Model drift threshold alerts.
- External provider outage detection.

## 21. Detailed Phase Plan

## Phase 0: Foundation and Repo Hardening (Week 1-2)

Objective:

- Stabilize dev workflow and set architecture guardrails before feature expansion.

Deliverables:

- Root-level architecture decision records.
- Python backend scaffold with FastAPI.
- Standardized env templates.
- Docker Compose for postgres + redis + api + worker.
- CI baseline (lint/test/build).

Implementation Tasks:

1. Add `backend_py/` scaffold with uv/poetry-managed dependencies.
2. Add unified logging package and request id middleware.
3. Add `/.env.example`, `backend_py/.env.example`, `frontend/.env.example`.
4. Introduce pre-commit hooks.
5. Add Makefile/task runner commands for dev workflows.
6. Define coding standards and API style guide under `docs/`.
7. Add compatibility proxy route for frontend to switch backend gradually.

Exit Criteria:

- Frontend and Python backend run in separate terminals reliably.
- Health endpoint returns status with dependency checks.
- CI passes on clean clone.

## Phase 1: Canonical Ingestion and Data Quality (Week 3-5)

Objective:

- Build robust ingestion pipeline for messy real-world datasets.

Deliverables:

- Upload -> validate -> normalize -> persist pipeline.
- Column mapping engine and reusable mapping templates.
- Data quality report API and UI.

Implementation Tasks:

1. Implement parser layer for CSV and XLSX.
2. Build column mapper with synonym dictionary.
3. Add schema validation via Pandera + Pydantic.
4. Add normalization engine for units/time/currency/country.
5. Add quarantine table and remediation feedback JSON.
6. Add ingestion job status endpoint with progress events.
7. Add hash-based cache reuse for duplicate uploads.
8. Add test fixtures with intentionally dirty files.

Exit Criteria:

- At least 95% of valid rows pass canonical conversion on benchmark sample files.
- Invalid rows are explainable with precise error codes.
- Re-upload same file with same mapping uses cache path.

## Phase 2: Geospatial Intelligence and Route Node Resolution (Week 6-7)

Objective:

- Resolve origin/destination points accurately for each mode.

Deliverables:

- Reference dictionaries for airports, ports, rail terminals, city centers.
- Resolver service with confidence scoring.
- Fallback hierarchy and override support.

Implementation Tasks:

1. Build reference ingestion for airports and ports datasets.
2. Create facility resolver with mode-aware nearest-node logic.
3. Store resolved nodes with source/confidence.
4. Add manual override API for corrected node mapping.
5. Add caching for geocode lookups and resolver outputs.
6. Add quality checks for impossible geospatial matches.

Exit Criteria:

- Resolver returns mode-consistent endpoints with confidence metadata.
- Manual overrides persist and supersede automated resolution.

## Phase 3: Multimodal Routing Engine (Week 8-11)

Objective:

- Generate route geometry that matches chosen mode semantics.

Deliverables:

- Mode-specific route providers.
- Multimodal composer.
- Antimeridian-safe geometry output.
- Route validation and quality scoring.

Implementation Tasks:

1. Implement road route provider using OSRM adapter.
2. Implement air route provider using airport nodes and great-circle arcs.
3. Implement sea route provider using maritime graph and chokepoints.
4. Implement rail route provider using extracted rail graph.
5. Build route composer for multimodal records.
6. Add geometry splitter for antimeridian crossing.
7. Add route validation checks (land/ocean consistency).
8. Add provider retry/fallback policy.
9. Add route generation metrics and benchmark suite.

Exit Criteria:

- Single-mode routes do not incorrectly render as other modes.
- Pacific crossings render smoothly without U-turn artifacts.
- Route API success rate above threshold on benchmark dataset.

## Phase 4: Risk Engine and Explainability (Week 12-13)

Objective:

- Deliver actionable route and shipment risk scoring.

Deliverables:

- Rule engine baseline.
- Feature extraction pipeline.
- Risk score API with factor explanations.

Implementation Tasks:

1. Implement baseline risk features by segment/lane.
2. Build score function with configurable weights.
3. Add risk tiering and recommendation templates.
4. Add risk explanation payload for frontend.
5. Add model-based calibration path as optional second stage.

Exit Criteria:

- Risk scores available for all routed shipments.
- Top factors shown with deterministic logic.

## Phase 5: Forecasting Platform (Week 14-16)

Objective:

- Provide predictive analytics for demand, delay, and cost.

Deliverables:

- Forecast training pipeline.
- Serving endpoints.
- Model evaluation dashboards.

Implementation Tasks:

1. Create feature views for forecasting.
2. Implement baseline classical models.
3. Implement gradient-boosted model path.
4. Add backtesting framework.
5. Track models and metrics in MLflow.
6. Add prediction service with confidence intervals.

Exit Criteria:

- Forecast endpoints return stable predictions.
- Baseline metrics documented with reproducible runs.

## Phase 6: Optimization and Decision Support (Week 17-18)

Objective:

- Recommend best plans under cost/time/risk constraints.

Deliverables:

- Optimization APIs.
- Multi-objective controls.
- Explainability for selected plans.

Implementation Tasks:

1. Define optimization problem schema.
2. Implement OR-Tools solver wrappers.
3. Add weighted objective scoring and constraint validation.
4. Add compare endpoint for alternative plans.
5. Add infeasibility diagnostics.

Exit Criteria:

- Optimizer returns feasible plans for benchmark cases.
- Frontend can compare recommended vs baseline plans.

## Phase 7: What-If Scenario Simulation (Week 19-20)

Objective:

- Enable interactive disruption simulations.

Deliverables:

- Scenario creation engine.
- Simulation runtime.
- KPI comparison reports.

Implementation Tasks:

1. Build scenario schema and parameter model.
2. Implement SimPy event simulation for shipment flows.
3. Add scenario storage and run history.
4. Add delta reporting APIs.
5. Add scenario templates for common disruptions.

Exit Criteria:

- Users can run and compare scenarios from UI.
- Results include actionable KPI deltas.

## Phase 8: AI Copilot (Week 21-23)

Objective:

- Provide natural language assistant backed by structured tools.

Deliverables:

- Copilot chat API with tool calling.
- RAG index for docs and run outputs.
- Actionable recommendations with citations.

Implementation Tasks:

1. Create retrieval pipeline for docs and model outputs.
2. Implement tool router for SQL, route, forecast, optimize, scenario.
3. Add guardrails and output schemas.
4. Add usage logging and feedback capture.
5. Add prompt templates for analyst personas.

Exit Criteria:

- Copilot answers with evidence and grounded data access.
- Sensitive operations require explicit user confirmation.

## Phase 9: Productionization and Reliability (Week 24-26)

Objective:

- Harden platform for real-world pilot usage.

Deliverables:

- Full observability dashboards.
- Load/performance tests.
- Security checklist and hardening.
- Deployment runbooks.

Implementation Tasks:

1. Add end-to-end integration test suite.
2. Add load tests for route and forecast endpoints.
3. Add failure injection tests for external providers.
4. Add backup/restore and migration runbooks.
5. Add model monitoring alerts and retraining playbook.

Exit Criteria:

- Pilot-ready environment with defined SLOs.
- Clear runbooks for common incidents.

## 22. Detailed Build Plan for Python Backend

## 22.1 Core Dependencies (Initial)

- `fastapi`
- `uvicorn`
- `pydantic`
- `sqlalchemy`
- `alembic`
- `psycopg[binary]`
- `redis`
- `celery`
- `pandas`
- `polars`
- `pyarrow`
- `duckdb`
- `pandera`
- `great-expectations`
- `scikit-learn`
- `lightgbm`
- `xgboost`
- `statsforecast`
- `mlflow`
- `networkx`
- `ortools`
- `simpy`
- `shapely`
- `geopandas`
- `pyproj`
- `httpx`
- `tenacity`
- `structlog`
- `prometheus-client`

## 22.2 Service Boundaries

- Ingestion service.
- Geospatial resolver service.
- Routing service.
- Risk service.
- Forecasting service.
- Optimization service.
- Scenario service.
- Copilot service.

Each service exposes internal Python interfaces and external API endpoints.

## 22.3 Job Queue Design

Queue names:

- `ingest-high`
- `ingest-normal`
- `routing`
- `forecast`
- `optimize`
- `simulation`
- `maintenance`

Task metadata:

- task_id
- parent_job_id
- retries
- status
- started_at
- ended_at
- payload_hash

## 22.4 API Versioning

- Prefix all APIs with `/api/v1`.
- Add non-breaking changes only within version.
- For breaking changes, create `/api/v2` and dual run for deprecation window.

## 23. Real-World Data Strategy

## 23.1 Source Categories

- Internal operations data.
- Carrier performance feeds.
- Public transportation network data.
- Port/airport metadata.
- External disruption feeds.

## 23.2 Data Acquisition Governance

- Record licensing for each dataset.
- Store provenance metadata.
- Validate refresh cadence and known gaps.

## 23.3 Handling Dirty Data

Common anomalies and handling:

- Missing origin/destination:
  - infer from related order records where possible.
- Duplicate shipment rows:
  - deterministic dedup with conflict policy.
- Invalid timestamps:
  - parse with robust parser and fallback timezone assumptions.
- Free-text location variants:
  - use dictionary + fuzzy matching + geocoder fallback.
- Mixed units:
  - detect and convert via rules.

## 23.4 Data Lineage

Track lineage columns in all silver/gold tables:

- `source_file`
- `source_row_number`
- `source_system`
- `ingestion_job_id`
- `transform_version`
- `processed_at`

## 24. Quality Engineering Strategy

## 24.1 Test Pyramid

- Unit tests for core functions.
- Integration tests for APIs and DB interactions.
- Contract tests between frontend and backend.
- End-to-end tests for upload->analysis->map->report flow.

## 24.2 Required Test Suites

- Ingestion validation tests.
- Route provider tests by mode.
- Antimeridian geometry tests.
- Forecast backtest regression tests.
- Optimizer feasibility tests.
- Copilot tool-call safety tests.

## 24.3 Golden Datasets

Create deterministic benchmark datasets:

- small (100 rows)
- medium (1,000 rows)
- large (10,000+ rows)

Use them for performance and regression comparisons.

## 25. Performance Engineering Plan

## 25.1 Backend Performance

- Async HTTP clients for external providers.
- Batch geocoding where policy allows.
- Cache expensive route computations.
- Use vectorized dataframe operations.
- Materialize expensive aggregates.

## 25.2 Frontend Performance

- Virtualized tables.
- Debounced filters.
- Lazy loading heavy panels.
- Simplified polylines at low zoom.
- Feature toggles for dense overlays.

## 25.3 Target SLOs

- Upload validation start response < 2s.
- Route enrichment for 100 rows < 60s (cold) and < 10s (cache hit).
- Forecast API p95 latency < 3s for single query.
- Map filter interaction < 300ms on 1,000 routes cached.

## 26. Cost Plan (Student-Friendly)

## 26.1 Zero-to-Low Cost Stack

- Local development using Docker Compose.
- OpenStreetMap-based providers where permitted.
- Local embeddings/models for development.
- One small cloud VM only when needed.

## 26.2 Optional Paid Upgrades (Only If Necessary)

- Managed Postgres.
- Managed Redis.
- Premium geocoding/routing API for SLA reliability.
- Hosted high-quality LLM for advanced copilot tasks.

## 26.3 Cost Guardrails

- Hard API rate limits.
- Caching before external calls.
- Daily budget monitor script.
- Disable expensive features in non-prod environments.

## 27. Risks and Mitigations

## 27.1 Technical Risks

- External API instability.
- Sparse data quality.
- Route inaccuracies in edge geographies.
- Model underperformance.
- UI degradation at scale.

## 27.2 Mitigation Tactics

- Provider fallback chain.
- Aggressive caching and memoization.
- Manual override workflows for critical routes.
- Baseline models always available.
- Progressive rendering and spatial indexing.

## 27.3 Product Risks

- Overbuilding before validating user workflows.
- Complex features without explainability.
- Slow onboarding due data mapping complexity.

## 27.4 Product Mitigations

- Ship incremental value every phase.
- Add explainability by default.
- Keep onboarding wizard and sample templates strong.

## 28. Implementation Backlog by Capability (Deep Task Breakdown)

## 28.1 Ingestion Backlog

1. Build `UploadSession` entity and DB table.
2. Build file checksum utility.
3. Build file type sniffer.
4. Build CSV parser with encoding fallback.
5. Build XLSX parser with sheet selection.
6. Build parser error reporting with row references.
7. Build column profile inference.
8. Build semantic column matcher dictionary.
9. Build mapping UI contract endpoint.
10. Build mapping template persistence.
11. Build required field completion checker.
12. Build type cast utility by canonical schema.
13. Build unit normalization utility.
14. Build timezone normalization utility.
15. Build currency normalization utility.
16. Build ISO country normalization utility.
17. Build null handling strategy config.
18. Build dedup fingerprint utility.
19. Build duplicate merge policy.
20. Build row-level validation error codes.
21. Build ingestion job orchestration DAG.
22. Build ingestion progress events.
23. Build quarantine store and retrieval API.
24. Build remediation suggestion engine.
25. Build cache lookup before pipeline run.
26. Build cache invalidation by schema version.
27. Build ingestion summary metrics endpoint.
28. Build ingestion idempotency key support.
29. Build tests for malformed CSV inputs.
30. Build tests for mixed locale date formats.

## 28.2 Geospatial Backlog

1. Build airports reference ingestion pipeline.
2. Build ports reference ingestion pipeline.
3. Build rail terminal reference ingestion pipeline.
4. Build city center geocode bootstrap.
5. Build geocode provider adapter interface.
6. Build Nominatim adapter with throttle controls.
7. Build secondary provider adapter.
8. Build resolver confidence scoring function.
9. Build nearest-node search with spatial index.
10. Build mode-aware endpoint resolver.
11. Build ambiguity resolver for duplicate city names.
12. Build manual override storage.
13. Build resolver cache table.
14. Build resolver audit trail.
15. Build resolver metrics and error taxonomy.
16. Build resolver contract tests.
17. Build fallback to dictionary on provider outage.
18. Build reverse-geocode sanity checker.
19. Build coordinate validity rules.
20. Build geospatial quality dashboard.

## 28.3 Routing Backlog

1. Build route provider interface contract.
2. Build OSRM road adapter.
3. Build road waypoint snapping utility.
4. Build retry logic for OSRM failures.
5. Build air route great-circle utility.
6. Build airport pairing constraints.
7. Build sea graph ingest tool.
8. Build chokepoint edge definitions.
9. Build sea path solver.
10. Build rail graph builder from OSM extract.
11. Build rail path solver.
12. Build multimodal segment composer.
13. Build transfer point selection logic.
14. Build antimeridian detection utility.
15. Build geometry split and wrap utility.
16. Build route quality scoring algorithm.
17. Build route validator against land/ocean masks.
18. Build route cache keyed by endpoints+mode+constraints.
19. Build route diagnostics payload.
20. Build route benchmark harness.
21. Build route provider health checks.
22. Build route provider fallback hierarchy.
23. Build route rendering geometry simplification.
24. Build route uncertainty flagging.
25. Build route contract tests by mode.
26. Build regression tests for Pacific crossings.
27. Build regression tests for Suez/Panama paths.
28. Build route comparison utility for A/B providers.
29. Build route metadata lineage.
30. Build route export API.

## 28.4 Risk Backlog

1. Define risk ontology.
2. Build risk factor registry.
3. Build weather risk ingestion adapter.
4. Build congestion risk ingestion adapter.
5. Build geopolitical risk ingestion adapter.
6. Build carrier reliability score calculator.
7. Build route complexity score calculator.
8. Build baseline risk scoring formula.
9. Build risk calibration model pipeline.
10. Build risk explanation generator.
11. Build risk confidence estimator.
12. Build risk tier mapping.
13. Build risk recommendation templates.
14. Build risk override controls.
15. Build risk drift monitoring metrics.
16. Build risk backtesting framework.
17. Build risk API endpoints.
18. Build risk dashboard aggregations.
19. Build risk alert thresholds.
20. Build risk test suite.

## 28.5 Forecasting Backlog

1. Build forecast target definitions.
2. Build forecast dataset builder.
3. Build temporal split utility.
4. Build seasonal naive baseline.
5. Build ARIMA/ETS baseline.
6. Build gradient boosted regressor baseline.
7. Build delay classifier model.
8. Build calibration utility for probabilistic outputs.
9. Build feature importance exporter.
10. Build horizon-specific model registry.
11. Build model training CLI entrypoint.
12. Build batch prediction job.
13. Build online prediction endpoint.
14. Build backtesting report generator.
15. Build metrics dashboard endpoint.
16. Build retraining scheduler.
17. Build model artifact retention policy.
18. Build forecast error alerting.
19. Build forecast explainability payload.
20. Build forecast API tests.

## 28.6 Optimization Backlog

1. Define optimization request schema.
2. Define objective weighting schema.
3. Build hard constraint validator.
4. Build OR-Tools model builder.
5. Build lane candidate generation.
6. Build solution post-processing.
7. Build infeasibility analysis.
8. Build alternative solution ranking.
9. Build sensitivity analysis utility.
10. Build emissions estimator integration.
11. Build optimization compare endpoint.
12. Build optimization benchmarking tests.
13. Build optimization cache strategy.
14. Build optimization timeout handling.
15. Build optimization explanation payload.
16. Build optimization UI contract.
17. Build optimization audit logs.
18. Build optimization solver health metrics.
19. Build optimization regression test suite.
20. Build optimization docs and examples.

## 28.7 Scenario Backlog

1. Define scenario template schema.
2. Build baseline snapshot creator.
3. Build disruption parameter model.
4. Build SimPy environment wrapper.
5. Build shipment event processors.
6. Build queue/capacity simulation components.
7. Build cost inflation event handler.
8. Build delay shock event handler.
9. Build facility outage event handler.
10. Build policy intervention event handler.
11. Build scenario run orchestration.
12. Build scenario result persistence.
13. Build KPI delta calculator.
14. Build scenario compare API.
15. Build scenario report generator.
16. Build scenario reproducibility metadata.
17. Build scenario template library.
18. Build scenario guardrails for unrealistic inputs.
19. Build scenario visualization payload.
20. Build scenario test suite.

## 28.8 Copilot Backlog

1. Define copilot intents taxonomy.
2. Build retrieval index pipeline.
3. Build structured tool interface.
4. Build SQL query tool with allowlist.
5. Build route tool adapter.
6. Build forecast tool adapter.
7. Build optimization tool adapter.
8. Build scenario tool adapter.
9. Build answer grounding checker.
10. Build citation formatter.
11. Build prompt templates by role.
12. Build safety filters and redaction.
13. Build conversation memory strategy.
14. Build feedback capture endpoint.
15. Build hallucination risk scoring.
16. Build escalation to human workflow.
17. Build copilot analytics dashboard.
18. Build copilot load/perf tests.
19. Build copilot regression prompts.
20. Build copilot policy docs.

## 28.9 Platform/DevEx Backlog

1. Build environment bootstrap scripts.
2. Build local stack health checker.
3. Build migration runner wrappers.
4. Build test data seeding scripts.
5. Build API client SDK generator.
6. Build OpenAPI contract validation in CI.
7. Build lint and typing gates.
8. Build smoke tests in CI pipeline.
9. Build release tagging convention.
10. Build changelog automation.
11. Build rollback strategy docs.
12. Build backup/restore scripts.
13. Build feature flag framework.
14. Build observability dashboards provisioning.
15. Build alert routing rules.
16. Build incident runbook template.
17. Build on-call checklist.
18. Build security scanning in CI.
19. Build dependency update automation.
20. Build contributor onboarding guide.

## 29. Data Contracts for Agents (Implementation Protocol)

Use this protocol for all future coding agents:

1. Before writing code, read `gameplan.md` sections relevant to your phase.
2. Confirm target API/data contract version in your task notes.
3. Do not bypass canonical schema validation.
4. Add tests for each new service path.
5. Add observability instrumentation for each endpoint/task.
6. Update docs for any contract changes.
7. Preserve backward compatibility unless explicitly approved.
8. Avoid adding hard-coded provider keys or secrets.
9. Add feature flags for risky new features.
10. Provide migration notes for deploy-impacting changes.

## 30. Suggested Milestone Timeline (26 Weeks)

- Week 1-2: Foundation.
- Week 3-5: Ingestion + quality.
- Week 6-7: Geospatial resolver.
- Week 8-11: Routing engine.
- Week 12-13: Risk engine.
- Week 14-16: Forecasting.
- Week 17-18: Optimization.
- Week 19-20: Scenario simulation.
- Week 21-23: Copilot.
- Week 24-26: Hardening and pilot.

## 31. Definition of Done by Capability

## 31.1 Ingestion DoD

- Upload works for CSV/XLSX.
- Column mapping saved and reusable.
- Validation errors are precise and user-facing.
- Canonical rows persisted with lineage.
- Cache hit path verified.

## 31.2 Routing DoD

- Single-mode routing honors mode semantics.
- Multimodal route segmented with explicit mode per segment.
- Antimeridian rendering correct.
- Route quality checks pass benchmark.

## 31.3 Forecast DoD

- Forecast endpoints produce deterministic outputs for fixed seeds.
- Metrics logged and available in dashboard.
- Backtests documented.

## 31.4 Optimization DoD

- Solver returns feasible plan or clear infeasibility reasons.
- Objective tradeoffs visible in output.

## 31.5 Copilot DoD

- Answers include citations.
- Tool calls audited.
- Dangerous actions blocked by policy.

## 32. Immediate Next Actions (First 10 Working Days)

Day 1:

- Create `backend_py` scaffold and dependencies.
- Add health endpoint and logging middleware.

Day 2:

- Stand up Postgres and Redis in Docker Compose.
- Add SQLAlchemy models for core entities.

Day 3:

- Implement upload API and raw file persistence.
- Add file hashing and metadata capture.

Day 4:

- Build canonical schema and validation rules.
- Build first data quality report endpoint.

Day 5:

- Build mapping template persistence and apply flow.
- Add integration tests for upload->validate.

Day 6:

- Build geocode adapter and resolver cache.
- Import airport and port reference datasets.

Day 7:

- Build road + air route provider prototypes.
- Add route response contract and tests.

Day 8:

- Build sea route prototype with chokepoint edges.
- Add antimeridian splitting utility.

Day 9:

- Connect frontend map to new route payload.
- Add mode filters and segment hover data.

Day 10:

- Run benchmark with sample files.
- Document known gaps and phase 2 backlog.

## 33. Final Notes

- This plan prioritizes reliable pipeline architecture over one-off demos.
- Keep phase boundaries strict to avoid scope creep.
- Deliver with testable increments and measurable KPIs.
- Maintain open-source-first defaults; add paid services only for hard reliability bottlenecks.
- Use this document as the source of truth for implementation sequencing.

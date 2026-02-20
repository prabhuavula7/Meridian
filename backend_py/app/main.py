import logging

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIdMiddleware
from app.services.health_service import build_health_response, health_http_status

settings = get_settings()
configure_logging(settings.app_log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Meridian AI Python backend scaffold (Phase 0A foundation).",
)

app.add_middleware(RequestIdMiddleware, settings=settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("python backend startup complete")


@app.get("/health")
async def root_health(response: Response):
    payload = await build_health_response(settings)
    response.status_code = health_http_status(payload)
    return payload


app.include_router(api_v1_router, prefix="/api/v1")

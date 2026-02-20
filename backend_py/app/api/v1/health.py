from fastapi import APIRouter, Depends, Response

from app.core.config import Settings, get_settings
from app.services.health_service import build_health_response, health_http_status

router = APIRouter()


@router.get("/health")
async def get_health(response: Response, settings: Settings = Depends(get_settings)):
    payload = await build_health_response(settings)
    response.status_code = health_http_status(payload)
    return payload

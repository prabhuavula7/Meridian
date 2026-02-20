from typing import Any

from fastapi import APIRouter, Depends, Request, Response

from app.core.config import Settings, get_settings
from app.services.proxy_service import proxy_get, proxy_post_json

router = APIRouter()


@router.post("/routes/enrich")
async def proxy_routes_enrich(
    request: Request, response: Response, settings: Settings = Depends(get_settings)
) -> dict[str, Any]:
    payload = await request.json()
    result = await proxy_post_json(settings, "routes/enrich", payload)
    response.status_code = int(result["status_code"])
    return result["payload"]


@router.post("/analyze-supply-chain")
async def proxy_analyze_supply_chain(
    request: Request, response: Response, settings: Settings = Depends(get_settings)
) -> dict[str, Any]:
    payload = await request.json()
    result = await proxy_post_json(settings, "analyze-supply-chain", payload)
    response.status_code = int(result["status_code"])
    return result["payload"]


@router.get("/analysis/health")
async def proxy_analysis_health(
    response: Response, settings: Settings = Depends(get_settings)
) -> dict[str, Any]:
    result = await proxy_get(settings, "analysis/health")
    response.status_code = int(result["status_code"])
    return result["payload"]


@router.get("/analysis/stats")
async def proxy_analysis_stats(
    response: Response, settings: Settings = Depends(get_settings)
) -> dict[str, Any]:
    result = await proxy_get(settings, "analysis/stats")
    response.status_code = int(result["status_code"])
    return result["payload"]


from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import Settings


def _build_proxy_url(settings: Settings, downstream_path: str) -> str:
    base = settings.legacy_backend_base_url.rstrip("/")
    path = downstream_path.lstrip("/")
    return f"{base}/{path}"


async def proxy_get(settings: Settings, downstream_path: str) -> dict[str, Any]:
    url = _build_proxy_url(settings, downstream_path)
    timeout = max(1000, settings.legacy_proxy_timeout_ms) / 1000

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.get(url)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Legacy backend request failed: {exc}") from exc

    if response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Legacy backend returned server error.")

    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        return {
            "status_code": response.status_code,
            "payload": response.json(),
        }

    return {
        "status_code": response.status_code,
        "payload": {"raw": response.text},
    }


async def proxy_post_json(
    settings: Settings, downstream_path: str, payload: dict[str, Any] | list[Any]
) -> dict[str, Any]:
    url = _build_proxy_url(settings, downstream_path)
    timeout = max(1000, settings.legacy_proxy_timeout_ms) / 1000

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, json=payload)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Legacy backend request failed: {exc}") from exc

    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        parsed = response.json()
    else:
        parsed = {"raw": response.text}

    if response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Legacy backend returned server error.")

    return {
        "status_code": response.status_code,
        "payload": parsed,
    }


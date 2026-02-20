import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict

from starlette import status

from app.core.config import Settings

CheckStatus = Literal["ok", "error", "skipped"]


class DependencyCheck(TypedDict):
    status: CheckStatus
    detail: str
    latency_ms: float | None


class HealthResponse(TypedDict):
    status: Literal["ok", "degraded"]
    service: str
    environment: str
    timestamp: str
    checks: dict[str, DependencyCheck]


def _elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 2)


async def _check_postgres(database_url: str | None) -> DependencyCheck:
    if not database_url:
        return {"status": "skipped", "detail": "DATABASE_URL not configured", "latency_ms": None}

    started = time.perf_counter()
    try:
        import asyncpg
    except Exception as exc:  # pragma: no cover - defensive import path
        return {
            "status": "error",
            "detail": f"asyncpg import failed: {exc}",
            "latency_ms": _elapsed_ms(started),
        }

    connection = None
    try:
        connection = await asyncio.wait_for(asyncpg.connect(database_url), timeout=2.5)
        await asyncio.wait_for(connection.fetchval("SELECT 1"), timeout=2.5)
        return {"status": "ok", "detail": "postgres reachable", "latency_ms": _elapsed_ms(started)}
    except Exception as exc:
        return {"status": "error", "detail": str(exc), "latency_ms": _elapsed_ms(started)}
    finally:
        if connection is not None:
            await connection.close()


async def _check_redis(redis_url: str | None) -> DependencyCheck:
    if not redis_url:
        return {"status": "skipped", "detail": "REDIS_URL not configured", "latency_ms": None}

    started = time.perf_counter()
    try:
        from redis.asyncio import Redis
    except Exception as exc:  # pragma: no cover - defensive import path
        return {
            "status": "error",
            "detail": f"redis import failed: {exc}",
            "latency_ms": _elapsed_ms(started),
        }

    client = Redis.from_url(redis_url, decode_responses=True)
    try:
        await asyncio.wait_for(client.ping(), timeout=2.5)
        return {"status": "ok", "detail": "redis reachable", "latency_ms": _elapsed_ms(started)}
    except Exception as exc:
        return {"status": "error", "detail": str(exc), "latency_ms": _elapsed_ms(started)}
    finally:
        close_method = getattr(client, "aclose", None)
        if callable(close_method):
            await close_method()
        else:  # pragma: no cover - compatibility path
            client.close()


async def build_health_response(settings: Settings) -> HealthResponse:
    postgres_check, redis_check = await asyncio.gather(
        _check_postgres(settings.database_url),
        _check_redis(settings.redis_url),
    )

    checks: dict[str, DependencyCheck] = {
        "api": {"status": "ok", "detail": "service operational", "latency_ms": 0.0},
        "postgres": postgres_check,
        "redis": redis_check,
    }

    overall_status: Literal["ok", "degraded"] = (
        "degraded" if any(check["status"] == "error" for check in checks.values()) else "ok"
    )

    return {
        "status": overall_status,
        "service": settings.app_name,
        "environment": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }


def health_http_status(payload: dict[str, Any]) -> int:
    return status.HTTP_200_OK if payload.get("status") == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE

import asyncio
import logging

from app.core.config import get_settings
from app.core.logging import configure_logging


async def _check_redis() -> None:
    settings = get_settings()
    logger = logging.getLogger(__name__)

    if not settings.redis_url:
        logger.info("worker heartbeat: REDIS_URL not configured; running in local stub mode")
        return

    try:
        from redis.asyncio import Redis

        client = Redis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        logger.info("worker heartbeat: redis reachable")
        close_method = getattr(client, "aclose", None)
        if callable(close_method):
            await close_method()
        else:  # pragma: no cover
            client.close()
    except Exception as exc:  # pragma: no cover - defensive runtime path
        logger.warning("worker heartbeat: redis check failed: %s", exc)


async def run_worker() -> None:
    settings = get_settings()
    configure_logging(settings.app_log_level)
    logger = logging.getLogger(__name__)
    logger.info("backend_py worker started")

    while True:
        await _check_redis()
        await asyncio.sleep(15)


if __name__ == "__main__":
    asyncio.run(run_worker())


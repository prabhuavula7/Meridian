from fastapi import APIRouter

from app.api.v1.compat import router as compat_router
from app.api.v1.health import router as health_router

router = APIRouter()
router.include_router(health_router)
router.include_router(compat_router)

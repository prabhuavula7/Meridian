from typing import Any

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.core.config import Settings, get_settings
from app.services.ingestion_service import get_upload, ingest_upload, list_uploads
from app.services.normalization_service import get_normalization_report, normalize_upload

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    result = await ingest_upload(settings, file)
    return {
        "success": True,
        "data": result.to_dict(),
    }


@router.get("/uploads")
async def get_uploads(
    limit: int = Query(default=50, ge=1, le=500),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    uploads = list_uploads(settings, limit=limit)
    return {
        "success": True,
        "data": {
            "count": len(uploads),
            "uploads": uploads,
        },
    }


@router.get("/uploads/{upload_id}")
async def get_upload_by_id(upload_id: str, settings: Settings = Depends(get_settings)) -> dict[str, Any]:
    upload = get_upload(settings, upload_id=upload_id)
    return {
        "success": True,
        "data": upload,
    }


@router.post("/uploads/{upload_id}/normalize")
async def normalize_uploaded_file(
    upload_id: str,
    max_errors: int = Query(default=100, ge=1, le=1000),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    report = normalize_upload(settings, upload_id=upload_id, max_errors=max_errors)
    return {
        "success": True,
        "data": report,
    }


@router.get("/uploads/{upload_id}/normalization")
async def get_uploaded_file_normalization(
    upload_id: str,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    report = get_normalization_report(settings, upload_id=upload_id)
    return {
        "success": True,
        "data": report,
    }

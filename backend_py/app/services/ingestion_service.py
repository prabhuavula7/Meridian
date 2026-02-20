import hashlib
import json
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile, status

from app.core.config import Settings

_MANIFEST_LOCK = threading.Lock()


@dataclass
class IngestionResult:
    upload_id: str
    file_hash: str
    original_filename: str
    stored_filename: str
    stored_path: str
    size_bytes: int
    content_type: str
    created_at: str
    cached: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "upload_id": self.upload_id,
            "file_hash": self.file_hash,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "stored_path": self.stored_path,
            "size_bytes": self.size_bytes,
            "content_type": self.content_type,
            "created_at": self.created_at,
            "cached": self.cached,
        }


def _allowed_extensions(settings: Settings) -> set[str]:
    parts = [part.strip().lower() for part in settings.upload_allowed_extensions.split(",")]
    return {part for part in parts if part}


def _read_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"uploads": []}

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion manifest is invalid JSON: {exc}",
        ) from exc


def _write_manifest(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _create_upload_record(
    *,
    file_hash: str,
    original_filename: str,
    stored_filename: str,
    stored_path: str,
    size_bytes: int,
    content_type: str,
) -> dict[str, Any]:
    return {
        "upload_id": f"upl_{uuid.uuid4().hex[:12]}",
        "file_hash": file_hash,
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "stored_path": stored_path,
        "size_bytes": size_bytes,
        "content_type": content_type,
        "created_at": _now_iso(),
    }


async def ingest_upload(settings: Settings, upload_file: UploadFile) -> IngestionResult:
    filename = upload_file.filename or ""
    extension = Path(filename).suffix.lower()
    allowed_extensions = _allowed_extensions(settings)

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{extension}'. Allowed: {sorted(allowed_extensions)}",
        )

    content = await upload_file.read()
    size_bytes = len(content)
    if size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if size_bytes > settings.upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds upload_max_bytes ({settings.upload_max_bytes}).",
        )

    file_hash = hashlib.sha256(content).hexdigest()
    storage_dir = Path(settings.upload_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = Path(settings.upload_manifest_path)

    with _MANIFEST_LOCK:
        manifest = _read_manifest(manifest_path)
        uploads = manifest.get("uploads", [])

        existing = next((record for record in uploads if record.get("file_hash") == file_hash), None)
        if existing:
            return IngestionResult(
                upload_id=str(existing["upload_id"]),
                file_hash=str(existing["file_hash"]),
                original_filename=str(existing["original_filename"]),
                stored_filename=str(existing["stored_filename"]),
                stored_path=str(existing["stored_path"]),
                size_bytes=int(existing["size_bytes"]),
                content_type=str(existing.get("content_type") or upload_file.content_type or "application/octet-stream"),
                created_at=str(existing["created_at"]),
                cached=True,
            )

        stored_filename = f"{file_hash}{extension}"
        stored_path = storage_dir / stored_filename
        stored_path.write_bytes(content)

        record = _create_upload_record(
            file_hash=file_hash,
            original_filename=filename,
            stored_filename=stored_filename,
            stored_path=str(stored_path),
            size_bytes=size_bytes,
            content_type=upload_file.content_type or "application/octet-stream",
        )
        uploads.append(record)
        manifest["uploads"] = uploads
        _write_manifest(manifest_path, manifest)

    return IngestionResult(
        upload_id=str(record["upload_id"]),
        file_hash=str(record["file_hash"]),
        original_filename=str(record["original_filename"]),
        stored_filename=str(record["stored_filename"]),
        stored_path=str(record["stored_path"]),
        size_bytes=int(record["size_bytes"]),
        content_type=str(record["content_type"]),
        created_at=str(record["created_at"]),
        cached=False,
    )


def list_uploads(settings: Settings, limit: int = 50) -> list[dict[str, Any]]:
    manifest_path = Path(settings.upload_manifest_path)
    with _MANIFEST_LOCK:
        manifest = _read_manifest(manifest_path)
        uploads = manifest.get("uploads", [])

    sorted_uploads = sorted(uploads, key=lambda item: item.get("created_at", ""), reverse=True)
    return sorted_uploads[: max(1, limit)]


def get_upload(settings: Settings, upload_id: str) -> dict[str, Any]:
    manifest_path = Path(settings.upload_manifest_path)
    with _MANIFEST_LOCK:
        manifest = _read_manifest(manifest_path)
        uploads = manifest.get("uploads", [])

    record = next((entry for entry in uploads if entry.get("upload_id") == upload_id), None)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload '{upload_id}' was not found.",
        )

    return record


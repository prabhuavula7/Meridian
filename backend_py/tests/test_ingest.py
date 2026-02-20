from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import app


def _override_settings(tmp_path: Path) -> Settings:
    return Settings(
        upload_storage_dir=str(tmp_path / "uploads"),
        upload_manifest_path=str(tmp_path / "ingestion_manifest.json"),
        upload_max_bytes=1024 * 1024,
        upload_allowed_extensions=".csv,.xlsx,.xls",
    )


def test_ingest_upload_and_dedupe(tmp_path: Path):
    settings = _override_settings(tmp_path)
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)

    try:
        sample_content = b"origin,destination\nShanghai,LA\n"
        response_first = client.post(
            "/api/v1/ingest/upload",
            files={"file": ("sample.csv", sample_content, "text/csv")},
        )
        assert response_first.status_code == 200
        first_data = response_first.json()["data"]
        assert first_data["cached"] is False
        assert first_data["original_filename"] == "sample.csv"

        response_second = client.post(
            "/api/v1/ingest/upload",
            files={"file": ("sample-copy.csv", sample_content, "text/csv")},
        )
        assert response_second.status_code == 200
        second_data = response_second.json()["data"]
        assert second_data["cached"] is True
        assert second_data["upload_id"] == first_data["upload_id"]
        assert second_data["file_hash"] == first_data["file_hash"]

        response_list = client.get("/api/v1/ingest/uploads")
        assert response_list.status_code == 200
        uploads = response_list.json()["data"]["uploads"]
        assert len(uploads) == 1
        assert uploads[0]["upload_id"] == first_data["upload_id"]

        response_get = client.get(f"/api/v1/ingest/uploads/{first_data['upload_id']}")
        assert response_get.status_code == 200
        assert response_get.json()["data"]["upload_id"] == first_data["upload_id"]
    finally:
        app.dependency_overrides.clear()


def test_ingest_upload_rejects_unsupported_extension(tmp_path: Path):
    settings = _override_settings(tmp_path)
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)

    try:
        response = client.post(
            "/api/v1/ingest/upload",
            files={"file": ("not_allowed.txt", b"hello", "text/plain")},
        )
        assert response.status_code == 400
        assert "Unsupported file extension" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


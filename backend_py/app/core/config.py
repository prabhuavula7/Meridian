from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
BACKEND_PY_ROOT = ROOT_ENV_PATH.parent / "backend_py"


class Settings(BaseSettings):
    app_name: str = "Meridian AI Python API"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_log_level: str = "INFO"
    app_request_id_header: str = "X-Request-ID"

    database_url: str | None = None
    redis_url: str | None = None
    legacy_backend_base_url: str = "http://localhost:5050/api/v1"
    legacy_proxy_timeout_ms: int = 20000
    upload_storage_dir: str = str(BACKEND_PY_ROOT / "data" / "uploads")
    upload_manifest_path: str = str(BACKEND_PY_ROOT / "data" / "ingestion_manifest.json")
    upload_max_bytes: int = 25 * 1024 * 1024
    upload_allowed_extensions: str = ".csv,.xlsx,.xls"

    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

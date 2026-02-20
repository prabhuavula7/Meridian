from fastapi.testclient import TestClient

from app.main import app


def test_root_health_endpoint_returns_dependency_checks():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code in (200, 503)
    payload = response.json()
    assert payload["service"]
    assert "checks" in payload
    assert "api" in payload["checks"]
    assert "postgres" in payload["checks"]
    assert "redis" in payload["checks"]


def test_v1_health_endpoint_exists():
    client = TestClient(app)
    response = client.get("/api/v1/health")

    assert response.status_code in (200, 503)

from fastapi.testclient import TestClient

from app.api.v1 import compat
from app.main import app


def test_routes_enrich_proxy_uses_legacy_payload_and_status(monkeypatch):
    async def fake_proxy_post_json(_settings, downstream_path, payload):
        assert downstream_path == "routes/enrich"
        assert payload == {"rows": [{"origin_location": "A", "destination_location": "B"}]}
        return {"status_code": 201, "payload": {"success": True, "source": "legacy"}}

    monkeypatch.setattr(compat, "proxy_post_json", fake_proxy_post_json)

    client = TestClient(app)
    response = client.post("/api/v1/routes/enrich", json={"rows": [{"origin_location": "A", "destination_location": "B"}]})

    assert response.status_code == 201
    assert response.json() == {"success": True, "source": "legacy"}


def test_analysis_health_proxy_forwards_payload(monkeypatch):
    async def fake_proxy_get(_settings, downstream_path):
        assert downstream_path == "analysis/health"
        return {"status_code": 200, "payload": {"success": True, "data": {"service": "legacy"}}}

    monkeypatch.setattr(compat, "proxy_get", fake_proxy_get)

    client = TestClient(app)
    response = client.get("/api/v1/analysis/health")

    assert response.status_code == 200
    assert response.json()["success"] is True


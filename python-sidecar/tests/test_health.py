from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200


def test_health_payload_shape(client: TestClient) -> None:
    payload = client.get("/health").json()

    assert payload["status"] == "ok"
    assert payload["service"] == "mozgoslav-python-sidecar"
    assert isinstance(payload["version"], str) and payload["version"]

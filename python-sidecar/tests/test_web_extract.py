from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def web_client() -> TestClient:
    return TestClient(create_app())


def test_web_extract_empty_url_returns_422(web_client: TestClient) -> None:
    res = web_client.post("/api/web-extract", json={"url": ""})
    assert res.status_code == 422


def test_web_extract_whitespace_url_returns_422(web_client: TestClient) -> None:
    res = web_client.post("/api/web-extract", json={"url": "   "})
    assert res.status_code == 422


def test_web_extract_trafilatura_not_installed_returns_503(
    web_client: TestClient,
) -> None:
    with patch.dict("sys.modules", {"trafilatura": None}):
        res = web_client.post("/api/web-extract", json={"url": "https://example.com"})
    assert res.status_code == 503


def test_web_extract_fetch_returns_none_returns_empty_body(
    web_client: TestClient,
) -> None:
    mock_trafilatura = MagicMock()
    mock_trafilatura.fetch_url.return_value = None

    with patch.dict("sys.modules", {"trafilatura": mock_trafilatura}):
        res = web_client.post(
            "/api/web-extract", json={"url": "https://example.com/404"}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["body"] is None
    assert data["title"] is None


def test_web_extract_happy_path_returns_body(web_client: TestClient) -> None:
    mock_trafilatura = MagicMock()
    mock_trafilatura.fetch_url.return_value = (
        "<html><body><p>Main content</p></body></html>"
    )
    mock_trafilatura.extract.side_effect = ["Main content", None]

    with patch.dict("sys.modules", {"trafilatura": mock_trafilatura}):
        res = web_client.post(
            "/api/web-extract", json={"url": "https://example.com/article"}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["body"] == "Main content"


def test_web_extract_excerpt_truncated_to_300_chars(web_client: TestClient) -> None:
    long_text = "A" * 400
    mock_trafilatura = MagicMock()
    mock_trafilatura.fetch_url.return_value = "<html><body><p>text</p></body></html>"
    mock_trafilatura.extract.side_effect = [long_text, None]

    with patch.dict("sys.modules", {"trafilatura": mock_trafilatura}):
        res = web_client.post(
            "/api/web-extract", json={"url": "https://example.com/long"}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["excerpt"] is not None
    assert len(data["excerpt"]) <= 300

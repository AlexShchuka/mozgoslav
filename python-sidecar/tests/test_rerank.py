from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def rerank_client() -> TestClient:
    return TestClient(create_app())


def test_rerank_empty_query_returns_422(rerank_client: TestClient) -> None:
    res = rerank_client.post(
        "/api/rerank",
        json={
            "model_id": "BAAI/bge-reranker-v2-m3",
            "query": "   ",
            "chunks": [{"id": "c1", "text": "some text"}],
        },
    )
    assert res.status_code == 422


def test_rerank_empty_chunks_returns_422(rerank_client: TestClient) -> None:
    res = rerank_client.post(
        "/api/rerank",
        json={
            "model_id": "BAAI/bge-reranker-v2-m3",
            "query": "test query",
            "chunks": [],
        },
    )
    assert res.status_code == 422


def test_rerank_happy_path_returns_sorted_by_score(rerank_client: TestClient) -> None:
    mock_scores = [0.3, 0.9, 0.1]
    mock_model = MagicMock()
    mock_model.predict.return_value = mock_scores

    with patch(
        "app.services.rerank_service.CrossEncoderReranker._get_model",
        return_value=mock_model,
    ):
        res = rerank_client.post(
            "/api/rerank",
            json={
                "model_id": "BAAI/bge-reranker-v2-m3",
                "query": "relevant question",
                "chunks": [
                    {"id": "c1", "text": "first chunk"},
                    {"id": "c2", "text": "second chunk"},
                    {"id": "c3", "text": "third chunk"},
                ],
            },
        )

    assert res.status_code == 200
    results = res.json()
    assert len(results) == 3
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)
    assert results[0]["id"] == "c2"


def test_rerank_missing_model_id_returns_422(rerank_client: TestClient) -> None:
    res = rerank_client.post(
        "/api/rerank",
        json={
            "query": "test",
            "chunks": [{"id": "c1", "text": "text"}],
        },
    )
    assert res.status_code == 422


def test_rerank_service_error_returns_503(rerank_client: TestClient) -> None:
    with patch(
        "app.services.rerank_service.CrossEncoderReranker._get_model",
        side_effect=RuntimeError("model load failed"),
    ):
        res = rerank_client.post(
            "/api/rerank",
            json={
                "model_id": "BAAI/bge-reranker-v2-m3",
                "query": "test query",
                "chunks": [{"id": "c1", "text": "text"}],
            },
        )
    assert res.status_code == 503

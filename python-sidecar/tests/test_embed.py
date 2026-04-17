"""Tests for the /api/embed endpoint and its service.

The sidecar ships a deterministic hash-bag-of-words fallback so these
tests stay hermetic on a dev box that hasn't installed
``sentence-transformers`` or PyTorch. The real model is exercised on a
macOS release host via the end-to-end smoke run.
"""
from __future__ import annotations

import math

import pytest
from fastapi.testclient import TestClient

from app.models.schemas import EmbedRequest
from app.services.embed_service import EmbedService, _fallback_embed


# ---- Service-level ---------------------------------------------------------


@pytest.fixture()
def service() -> EmbedService:
    return EmbedService()


def test_service_returns_unit_norm_vectors(service: EmbedService) -> None:
    response = service.embed(EmbedRequest(texts=["синхронизация через syncthing"]))

    assert response.dimensions > 0
    assert len(response.vectors) == 1

    norm = math.sqrt(sum(v * v for v in response.vectors[0]))
    assert math.isclose(norm, 1.0, abs_tol=1e-6)


def test_service_is_deterministic(service: EmbedService) -> None:
    a = service.embed(EmbedRequest(texts=["hello world"])).vectors[0]
    b = service.embed(EmbedRequest(texts=["hello world"])).vectors[0]
    assert a == b


def test_service_batches_preserve_order(service: EmbedService) -> None:
    batch = service.embed(
        EmbedRequest(texts=["первый", "второй", "третий"])
    ).vectors

    assert len(batch) == 3
    assert batch[0] != batch[1] != batch[2]


def test_fallback_empty_text_returns_zero_vector() -> None:
    vec = _fallback_embed("")
    assert all(v == 0.0 for v in vec)


def test_fallback_similar_texts_share_buckets() -> None:
    a = _fallback_embed("Syncthing pairing works")
    b = _fallback_embed("Syncthing pairing is easy")

    # Dot product of L2-normalised vectors == cosine similarity.
    cosine = sum(x * y for x, y in zip(a, b))
    assert cosine > 0.3


# ---- HTTP-level ------------------------------------------------------------


def test_embed_endpoint_roundtrip(client: TestClient) -> None:
    response = client.post(
        "/api/embed",
        json={"texts": ["hello", "world"]},
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["dimensions"] > 0
    assert len(payload["vectors"]) == 2
    assert all(len(vec) == payload["dimensions"] for vec in payload["vectors"])


def test_embed_endpoint_rejects_empty_batch(client: TestClient) -> None:
    response = client.post("/api/embed", json={"texts": []})
    assert response.status_code == 422

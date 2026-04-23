from __future__ import annotations

import math

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.embed_service import (
    DIM,
    DeterministicBoWBackend,
    _l2_normalise,
    default_backend,
)


@pytest.fixture
def embed_client() -> TestClient:

    return TestClient(create_app())


def test_embed_happy_path_returns_384_dim_l2_normalised(
    embed_client: TestClient,
) -> None:
    res = embed_client.post("/api/embed", json={"text": "привет, мир"})
    assert res.status_code == 200
    data = res.json()
    assert data["dim"] == DIM
    vec = data["embedding"]
    assert len(vec) == DIM
    norm = math.sqrt(sum(v * v for v in vec))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)


def test_embed_ascii_text_also_returns_unit_vector(
    embed_client: TestClient,
) -> None:
    res = embed_client.post("/api/embed", json={"text": "hello world"})
    assert res.status_code == 200
    data = res.json()
    assert data["dim"] == DIM
    assert len(data["embedding"]) == DIM
    norm = math.sqrt(sum(v * v for v in data["embedding"]))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)


def test_embed_empty_text_returns_422(embed_client: TestClient) -> None:
    res = embed_client.post("/api/embed", json={"text": ""})
    assert res.status_code == 422


def test_embed_whitespace_only_returns_422(embed_client: TestClient) -> None:
    res = embed_client.post("/api/embed", json={"text": "   "})
    assert res.status_code == 422


def test_embed_tab_and_newline_only_returns_422(embed_client: TestClient) -> None:
    res = embed_client.post("/api/embed", json={"text": "\t\n \r"})
    assert res.status_code == 422


def test_embed_missing_text_field_returns_422(embed_client: TestClient) -> None:
    res = embed_client.post("/api/embed", json={})
    assert res.status_code == 422


def test_embed_deterministic_bow_same_text_same_vector() -> None:

    backend = DeterministicBoWBackend()
    v1 = backend.embed("repeatable input")
    v2 = backend.embed("repeatable input")
    assert v1 == v2


def test_embed_deterministic_bow_different_texts_different_vectors() -> None:
    backend = DeterministicBoWBackend()
    v1 = backend.embed("alpha bravo")
    v2 = backend.embed("charlie delta")
    assert v1 != v2


def test_embed_deterministic_bow_output_is_l2_normalised() -> None:
    backend = DeterministicBoWBackend()
    vec = backend.embed("Syncthing pairing works")
    norm = math.sqrt(sum(v * v for v in vec))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)
    assert len(vec) == DIM


def test_embed_deterministic_bow_empty_token_stream_returns_uniform_unit() -> None:

    backend = DeterministicBoWBackend()
    vec = backend.embed("")
    assert len(vec) == DIM
    norm = math.sqrt(sum(v * v for v in vec))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)


def test_embed_deterministic_bow_is_case_insensitive() -> None:
    backend = DeterministicBoWBackend()
    lower = backend.embed("hello world")
    upper = backend.embed("HELLO WORLD")
    assert lower == upper


def test_default_backend_is_deterministic_in_pod() -> None:

    default_backend.cache_clear()
    backend = default_backend()
    assert isinstance(backend, DeterministicBoWBackend)


def test_l2_normalise_zero_input_returns_unit_vector() -> None:
    vec = _l2_normalise([0.0] * DIM)
    assert len(vec) == DIM
    norm = math.sqrt(sum(v * v for v in vec))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)


def test_l2_normalise_scales_nonzero_vector_to_unit_norm() -> None:
    vec = _l2_normalise([3.0, 4.0] + [0.0] * (DIM - 2))
    norm = math.sqrt(sum(v * v for v in vec))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)
    assert math.isclose(vec[0], 0.6, abs_tol=1e-6)
    assert math.isclose(vec[1], 0.8, abs_tol=1e-6)

"""Tests for the /api/cleanup endpoint and its service.

Mirrors the behavioural expectations recorded in PYTHON-SIDECAR-SPEC §11.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.models.schemas import CleanupLevel, CleanupRequest
from app.services.cleanup_service import CleanupService


# ---- Service-level tests ---------------------------------------------------


@pytest.fixture()
def service() -> CleanupService:
    return CleanupService()


def test_removes_basic_fillers(service: CleanupService) -> None:
    result = service.cleanup(CleanupRequest(text="ну вот типа привет"))
    assert result.cleaned == "привет"


def test_removes_duplicate_words(service: CleanupService) -> None:
    result = service.cleanup(CleanupRequest(text="привет привет мир"))
    assert result.cleaned == "привет мир"


def test_preserves_clean_text(service: CleanupService) -> None:
    result = service.cleanup(CleanupRequest(text="всё хорошо работает"))
    assert result.cleaned == "всё хорошо работает"


def test_none_level_preserves_all(service: CleanupService) -> None:
    result = service.cleanup(
        CleanupRequest(text="ну вот типа привет", level=CleanupLevel.none)
    )
    assert result.cleaned == "ну вот типа привет"


def test_aggressive_removes_composite_fillers(service: CleanupService) -> None:
    result = service.cleanup(
        CleanupRequest(
            text="ну короче в общем всё готово",
            level=CleanupLevel.aggressive,
        )
    )
    assert result.cleaned == "всё готово"


# ---- HTTP-level test -------------------------------------------------------


def test_cleanup_endpoint_roundtrip(client: TestClient) -> None:
    response = client.post(
        "/api/cleanup",
        json={"text": "ну типа работает", "level": "light"},
    )
    assert response.status_code == 200
    assert response.json() == {"cleaned": "работает"}

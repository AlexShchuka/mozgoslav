"""Tests for ``app/services/gender_service.py`` (``POST /api/gender``).

Heavy ML path (``audeering/wav2vec2-large-robust-24-ft-age-gender``)
needs the real weights, which are Tier-2 and therefore not present
in CI. We exercise the absent-model / 503 envelope path plus the
label-mapping logic in isolation.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.ml.errors import ModelNotAvailableError
from app.ml.loader import clear_all_caches
from app.ml.model_paths import AUDEERING_GENDER_ID, ModelPaths
from app.models.schemas import GenderRequest
from app.services.gender_service import GenderService, _to_response
import numpy as np


def test_classify_raises_model_not_available_when_weights_absent(tmp_path: Path) -> None:
    service = GenderService(ModelPaths(tmp_path))
    with pytest.raises(ModelNotAvailableError) as excinfo:
        service.classify(GenderRequest(audio_path="/tmp/any.wav"))
    assert excinfo.value.model_id == AUDEERING_GENDER_ID
    assert "huggingface" in excinfo.value.download_url.lower()


def test_http_endpoint_returns_503_envelope_when_weights_absent(
    monkeypatch, tmp_path: Path, client: TestClient
) -> None:
    # Route the resolver at an empty directory so audeering_gender() → None.
    monkeypatch.setenv("MOZGOSLAV_MODELS_DIR", str(tmp_path))
    clear_all_caches()
    try:
        response = client.post("/api/gender", json={"audio_path": "/tmp/any.wav"})
    finally:
        clear_all_caches()

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"] == "model_not_installed"
    assert payload["model_id"] == AUDEERING_GENDER_ID
    assert payload["download_url"].startswith("https://huggingface.co/")
    assert "Settings" in payload["hint"]


def test_to_response_prefers_highest_class() -> None:
    # audeering head order: [female, male, child]
    female_heavy = np.array([0.8, 0.1, 0.1], dtype=np.float32)
    result = _to_response(female_heavy)
    assert result.gender == "female"
    assert result.confidence == pytest.approx(0.9)  # child folds into female

    male_heavy = np.array([0.1, 0.85, 0.05], dtype=np.float32)
    result = _to_response(male_heavy)
    assert result.gender == "male"
    assert result.confidence == pytest.approx(0.85)


def test_to_response_routes_child_to_female() -> None:
    child_heavy = np.array([0.2, 0.3, 0.5], dtype=np.float32)
    result = _to_response(child_heavy)
    # child (0.5) + female (0.2) = 0.7 > male (0.3) → female wins.
    assert result.gender == "female"


def test_to_response_reports_unknown_on_tie() -> None:
    tie = np.array([0.35, 0.35, 0.3], dtype=np.float32)
    result = _to_response(tie)
    # 0.35 + 0.3 (child→female) = 0.65 > 0.35 male → still female.
    # Construct an actual tie:
    exact_tie = np.array([0.25, 0.5, 0.25], dtype=np.float32)
    result = _to_response(exact_tie)
    # female+child = 0.5, male = 0.5 → unknown.
    assert result.gender == "unknown"

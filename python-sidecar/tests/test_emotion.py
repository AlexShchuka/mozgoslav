from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.ml.errors import ModelNotAvailableError
from app.ml.loader import clear_all_caches
from app.ml.model_paths import AUDEERING_EMOTION_ID, ModelPaths
from app.models.schemas import EmotionRequest
from app.services.emotion_service import EmotionService, _label_from_av


def test_classify_raises_model_not_available_when_weights_absent(
    tmp_path: Path,
) -> None:
    service = EmotionService(ModelPaths(tmp_path))
    with pytest.raises(ModelNotAvailableError) as excinfo:
        service.classify(EmotionRequest(audio_path="/tmp/any.wav"))
    assert excinfo.value.model_id == AUDEERING_EMOTION_ID
    assert "emotion" in excinfo.value.download_url.lower()


def test_http_endpoint_returns_503_envelope_when_weights_absent(
    monkeypatch, tmp_path: Path, client: TestClient
) -> None:
    monkeypatch.setenv("MOZGOSLAV_MODELS_DIR", str(tmp_path))
    clear_all_caches()
    try:
        response = client.post("/api/emotion", json={"audio_path": "/tmp/any.wav"})
    finally:
        clear_all_caches()

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"] == "model_not_installed"
    assert payload["model_id"] == AUDEERING_EMOTION_ID


def test_label_joy_for_positive_valence_high_arousal() -> None:
    assert _label_from_av(arousal=0.6, valence=0.5) == "joy"


def test_label_calm_for_positive_valence_low_arousal() -> None:
    assert _label_from_av(arousal=-0.3, valence=0.4) == "calm"


def test_label_anger_for_negative_valence_high_arousal() -> None:
    assert _label_from_av(arousal=0.7, valence=-0.6) == "anger"


def test_label_sadness_for_negative_valence_low_arousal() -> None:
    assert _label_from_av(arousal=-0.5, valence=-0.5) == "sadness"


def test_label_neutral_in_central_zone() -> None:
    assert _label_from_av(arousal=0.05, valence=-0.1) == "neutral"

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models.schemas import (
    CleanupResponse,
    DiarizeResponse,
    EmotionResponse,
    GenderResponse,
    NerResponse,
    SpeakerSegment,
)


@pytest.fixture
def processall_client() -> TestClient:
    return TestClient(create_app())


def _make_diarize_result() -> DiarizeResponse:
    return DiarizeResponse(
        segments=[SpeakerSegment(speaker="A", start=0.0, end=1.5)],
        num_speakers=1,
    )


def _make_gender_result() -> GenderResponse:
    return GenderResponse(gender="male", confidence=0.85)


def _make_emotion_result() -> EmotionResponse:
    return EmotionResponse(emotion="neutral", valence=0.0, arousal=0.0, dominance=0.0)


def _make_ner_result() -> NerResponse:
    return NerResponse(people=["Alice"], orgs=[], locations=[], dates=[])


def _make_cleanup_result() -> CleanupResponse:
    return CleanupResponse(cleaned="cleaned transcript text")


def test_processall_missing_audio_path_returns_422(processall_client: TestClient) -> None:
    res = processall_client.post("/api/process-all", json={})
    assert res.status_code == 422


def test_processall_empty_audio_path_returns_422(processall_client: TestClient) -> None:
    res = processall_client.post("/api/process-all", json={"audio_path": ""})
    assert res.status_code == 422


def test_processall_file_not_found_returns_404(processall_client: TestClient) -> None:
    mock_diarize_svc = MagicMock()
    mock_diarize_svc.diarize.side_effect = FileNotFoundError("Audio file not found")

    with patch("app.routers.processall.get_diarize_service", return_value=mock_diarize_svc):
        res = processall_client.post(
            "/api/process-all",
            json={"audio_path": "/nonexistent/file.wav"},
        )

    assert res.status_code == 404


def test_processall_all_steps_returns_merged_result(processall_client: TestClient) -> None:
    mock_diarize_svc = MagicMock()
    mock_diarize_svc.diarize.return_value = _make_diarize_result()

    mock_gender_svc = MagicMock()
    mock_gender_svc.classify.return_value = _make_gender_result()

    mock_emotion_svc = MagicMock()
    mock_emotion_svc.classify.return_value = _make_emotion_result()

    mock_ner_svc = MagicMock()
    mock_ner_svc.extract.return_value = _make_ner_result()

    mock_embed = MagicMock()
    mock_embed.embed.return_value = [0.1] * 384

    with (
        patch("app.routers.processall.get_diarize_service", return_value=mock_diarize_svc),
        patch("app.routers.processall.get_gender_service", return_value=mock_gender_svc),
        patch("app.routers.processall.get_emotion_service", return_value=mock_emotion_svc),
        patch("app.routers.processall.get_ner_service", return_value=mock_ner_svc),
        patch("app.routers.processall.default_backend", return_value=mock_embed),
    ):
        res = processall_client.post(
            "/api/process-all",
            json={"audio_path": "/fake/audio.wav"},
        )

    assert res.status_code == 200
    data = res.json()
    assert "diarize" in data
    assert "gender" in data
    assert "emotion" in data
    assert "ner" in data
    assert "cleanup" in data
    assert "embed" in data
    assert data["embed"]["dim"] == 384


def test_processall_subset_steps_only_calls_specified(processall_client: TestClient) -> None:
    mock_embed = MagicMock()
    mock_embed.embed.return_value = [0.5] * 384

    mock_diarize_svc = MagicMock()
    mock_diarize_svc.diarize.return_value = _make_diarize_result()

    mock_gender_svc = MagicMock()
    mock_emotion_svc = MagicMock()
    mock_ner_svc = MagicMock()

    with (
        patch("app.routers.processall.get_diarize_service", return_value=mock_diarize_svc),
        patch("app.routers.processall.get_gender_service", return_value=mock_gender_svc),
        patch("app.routers.processall.get_emotion_service", return_value=mock_emotion_svc),
        patch("app.routers.processall.get_ner_service", return_value=mock_ner_svc),
        patch("app.routers.processall.default_backend", return_value=mock_embed),
    ):
        res = processall_client.post(
            "/api/process-all",
            json={"audio_path": "/fake/audio.wav", "steps": ["diarize", "embed"]},
        )

    assert res.status_code == 200
    data = res.json()
    assert data["diarize"] is not None
    assert data["embed"] is not None
    mock_gender_svc.classify.assert_not_called()
    mock_emotion_svc.classify.assert_not_called()
    mock_ner_svc.extract.assert_not_called()

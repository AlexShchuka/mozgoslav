from __future__ import annotations

import wave
from pathlib import Path

import numpy as np
import pytest

from app.models.schemas import DiarizeRequest
from app.services.diarize_service import (
    DiarizeService,
    _label_name,
    _merge_short_into_nearest,
)


class _StubVad:
    def __init__(self, _script: list[tuple[float, float]]) -> None:
        self._script = _script


class _StubEmbedder:
    def __init__(self, pattern: list[int]) -> None:
        self._pattern = iter(pattern)

    def embed_utterance(self, wav: np.ndarray) -> np.ndarray:  # noqa: ARG002
        idx = next(self._pattern)
        vec = np.zeros(8, dtype=np.float32)
        vec[idx] = 1.0
        return vec


def _build_service_with_script(
    *, vad_segments: list[tuple[float, float]], embed_pattern: list[int]
) -> DiarizeService:

    class _ScriptedService(DiarizeService):
        def _vad_segments(self, wav: np.ndarray) -> list[tuple[float, float]]:  # noqa: ARG002
            return list(vad_segments)

    from app.ml.model_paths import ModelPaths  # noqa: PLC0415

    paths = ModelPaths(Path("/tmp/definitely-missing"))
    return _ScriptedService(
        paths, embedder=_StubEmbedder(embed_pattern), vad_model=object()
    )


def _write_silent_wav(path: Path, duration_seconds: float = 3.0) -> None:

    samples = np.zeros(int(16_000 * duration_seconds), dtype=np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16_000)
        w.writeframes(samples.tobytes())


def test_diarize_returns_empty_when_vad_finds_no_speech(tmp_path: Path) -> None:
    audio = tmp_path / "silent.wav"
    _write_silent_wav(audio)
    service = _build_service_with_script(vad_segments=[], embed_pattern=[])
    result = service.diarize(DiarizeRequest(audio_path=str(audio)))
    assert result.segments == []
    assert result.num_speakers == 0


def test_diarize_single_speaker_collapses_to_one_label(tmp_path: Path) -> None:
    audio = tmp_path / "sample.wav"
    _write_silent_wav(audio)
    service = _build_service_with_script(
        vad_segments=[(0.0, 1.0), (1.5, 2.4)],
        embed_pattern=[0, 0],
    )
    result = service.diarize(DiarizeRequest(audio_path=str(audio)))
    speakers = {segment.speaker for segment in result.segments}
    assert speakers == {"A"}
    assert result.num_speakers == 1


def test_diarize_two_distinct_embeddings_produce_two_speakers(tmp_path: Path) -> None:
    audio = tmp_path / "sample.wav"
    _write_silent_wav(audio)
    service = _build_service_with_script(
        vad_segments=[(0.0, 1.0), (1.5, 2.5)],
        embed_pattern=[0, 3],
    )
    result = service.diarize(DiarizeRequest(audio_path=str(audio)))
    assert result.num_speakers == 2
    assert {segment.speaker for segment in result.segments} == {"A", "B"}


def test_diarize_short_segment_glued_to_nearest_long_cluster(tmp_path: Path) -> None:
    audio = tmp_path / "sample.wav"
    _write_silent_wav(audio)
    service = _build_service_with_script(
        vad_segments=[(0.0, 1.0), (1.1, 1.3), (1.5, 2.5)],
        embed_pattern=[0, 3],
    )
    result = service.diarize(DiarizeRequest(audio_path=str(audio)))
    assert len(result.segments) == 3
    assert result.segments[1].speaker == result.segments[0].speaker


def test_diarize_raises_when_audio_file_missing(tmp_path: Path) -> None:
    service = _build_service_with_script(vad_segments=[], embed_pattern=[])
    with pytest.raises(FileNotFoundError):
        service.diarize(DiarizeRequest(audio_path=str(tmp_path / "missing.wav")))


def test_merge_short_into_nearest_uses_label_letters() -> None:

    segments = _merge_short_into_nearest(
        all_segments=[(0.0, 1.0), (2.0, 3.0)],
        long_segments=[(0.0, 1.0), (2.0, 3.0)],
        long_labels=[0, 1],
    )
    assert [s.speaker for s in segments] == ["A", "B"]


def test_label_name_wraps_after_z() -> None:

    assert _label_name(0) == "A"
    assert _label_name(25) == "Z"
    assert _label_name(26) == "SPEAKER_26"

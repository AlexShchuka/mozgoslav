from __future__ import annotations

from pathlib import Path
from typing import Protocol

import numpy as np

from app.ml.model_paths import ModelPaths
from app.models.schemas import DiarizeRequest, DiarizeResponse, SpeakerSegment


_TARGET_SR = 16_000
_MIN_EMBED_SECONDS = 0.7
_CLUSTER_DISTANCE_THRESHOLD = 0.75
_VAD_MIN_SPEECH_MS = 250
_VAD_MIN_SILENCE_MS = 300


class _Embedder(Protocol):

    def embed_utterance(self, wav: np.ndarray) -> np.ndarray: ...


class DiarizeService:

    def __init__(
        self,
        paths: ModelPaths,
        *,
        embedder: _Embedder | None = None,
        vad_model: object | None = None,
    ) -> None:
        self._paths = paths
        self._embedder = embedder or _load_default_embedder()
        self._vad = vad_model or _load_default_vad()

    def diarize(self, request: DiarizeRequest) -> DiarizeResponse:
        audio_path = Path(request.audio_path)
        if not audio_path.is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        wav = _load_audio(audio_path, target_sr=_TARGET_SR)
        if wav.size == 0:
            raise ValueError(f"Audio file decoded to zero samples: {audio_path}")

        vad_segments = self._vad_segments(wav)
        if not vad_segments:
            return DiarizeResponse(segments=[], num_speakers=0)

        long_segments = [
            (start, end)
            for start, end in vad_segments
            if (end - start) >= _MIN_EMBED_SECONDS
        ]

        if long_segments:
            embeddings = np.stack(
                [self._embedder.embed_utterance(wav[int(s * _TARGET_SR) : int(e * _TARGET_SR)])
                 for s, e in long_segments]
            )
            labels = _cluster(
                embeddings,
                min_speakers=request.min_speakers,
                max_speakers=request.max_speakers,
            )
        else:
            labels = []

        return DiarizeResponse(
            segments=_merge_short_into_nearest(vad_segments, long_segments, labels),
            num_speakers=len({int(label) for label in labels}) if labels else 0,
        )


    def _vad_segments(self, wav: np.ndarray) -> list[tuple[float, float]]:
        import torch  # noqa: PLC0415
        from silero_vad import get_speech_timestamps  # noqa: PLC0415

        tensor = torch.from_numpy(wav)
        timestamps = get_speech_timestamps(
            tensor,
            self._vad,
            sampling_rate=_TARGET_SR,
            min_speech_duration_ms=_VAD_MIN_SPEECH_MS,
            min_silence_duration_ms=_VAD_MIN_SILENCE_MS,
            return_seconds=True,
        )
        return [(float(t["start"]), float(t["end"])) for t in timestamps]


def _cluster(
    embeddings: np.ndarray,
    *,
    min_speakers: int | None,
    max_speakers: int | None,
) -> list[int]:
    from sklearn.cluster import AgglomerativeClustering  # noqa: PLC0415

    if embeddings.shape[0] == 1:
        return [0]

    if min_speakers is not None and min_speakers == max_speakers:
        clusterer = AgglomerativeClustering(
            n_clusters=min_speakers, metric="cosine", linkage="average"
        )
    else:
        clusterer = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=_CLUSTER_DISTANCE_THRESHOLD,
            metric="cosine",
            linkage="average",
        )
    return [int(label) for label in clusterer.fit_predict(embeddings)]


def _merge_short_into_nearest(
    all_segments: list[tuple[float, float]],
    long_segments: list[tuple[float, float]],
    long_labels: list[int],
) -> list[SpeakerSegment]:

    if not long_segments:
        return [
            SpeakerSegment(speaker="A", start=start, end=end)
            for start, end in all_segments
        ]

    output: list[SpeakerSegment] = []
    for start, end in all_segments:
        if (start, end) in long_segments:
            idx = long_segments.index((start, end))
            label = long_labels[idx]
        else:
            midpoint = (start + end) / 2
            nearest_idx = min(
                range(len(long_segments)),
                key=lambda i: abs(((long_segments[i][0] + long_segments[i][1]) / 2) - midpoint),
            )
            label = long_labels[nearest_idx]
        output.append(SpeakerSegment(
            speaker=_label_name(label),
            start=start,
            end=end,
        ))
    return output


def _label_name(label: int) -> str:

    if label < 26:
        return chr(ord("A") + label)
    return f"SPEAKER_{label:02d}"


def _load_audio(path: Path, *, target_sr: int) -> np.ndarray:
    import librosa  # noqa: PLC0415

    wav, _sr = librosa.load(str(path), sr=target_sr, mono=True)
    return np.asarray(wav, dtype=np.float32)


def _load_default_vad() -> object:
    from silero_vad import load_silero_vad  # noqa: PLC0415

    return load_silero_vad()


def _load_default_embedder() -> _Embedder:
    from resemblyzer import VoiceEncoder  # noqa: PLC0415

    return VoiceEncoder(verbose=False)

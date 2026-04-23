from __future__ import annotations

from pathlib import Path

import numpy as np

from app.ml.errors import ModelNotAvailableError
from app.ml.model_paths import (
    AUDEERING_EMOTION_ID,
    AUDEERING_EMOTION_URL,
    ModelPaths,
)
from app.ml.patches import safe_emotion_cfg
from app.models.schemas import EmotionRequest, EmotionResponse


_TARGET_SR = 16_000


class EmotionService:

    def __init__(self, paths: ModelPaths) -> None:
        self._paths = paths
        self._model = None
        self._feature_extractor = None

    def classify(self, request: EmotionRequest) -> EmotionResponse:
        self._ensure_loaded()
        wav = _load_audio(Path(request.audio_path))
        arousal, valence, dominance = self._predict(wav)
        label = _label_from_av(arousal=arousal, valence=valence)
        return EmotionResponse(
            emotion=label,
            valence=valence,
            arousal=arousal,
            dominance=dominance,
        )

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        model_dir = self._paths.audeering_emotion()
        if model_dir is None:
            raise ModelNotAvailableError(
                model_id=AUDEERING_EMOTION_ID,
                download_url=AUDEERING_EMOTION_URL,
            )

        import torch  # noqa: F401, PLC0415
        from transformers import AutoConfig, AutoFeatureExtractor, AutoModelForAudioClassification  # noqa: PLC0415

        cfg = safe_emotion_cfg(AutoConfig.from_pretrained(str(model_dir)))
        self._feature_extractor = AutoFeatureExtractor.from_pretrained(str(model_dir))
        self._model = AutoModelForAudioClassification.from_pretrained(
            str(model_dir), config=cfg
        )
        self._model.eval()

    def _predict(self, wav: np.ndarray) -> tuple[float, float, float]:
        import torch  # noqa: PLC0415

        inputs = self._feature_extractor(
            wav, sampling_rate=_TARGET_SR, return_tensors="pt"
        )
        with torch.no_grad():
            logits = self._model(**inputs).logits[0]
        values = logits.cpu().numpy()
        arousal = float(np.clip(values[0], 0.0, 1.0))
        dominance = float(np.clip(values[1], 0.0, 1.0))
        valence = float(np.clip(values[2], 0.0, 1.0))
        return (
            _to_signed(arousal),
            _to_signed(valence),
            _to_signed(dominance),
        )


def _to_signed(value: float) -> float:

    return float(value * 2.0 - 1.0)


def _label_from_av(*, arousal: float, valence: float) -> str:

    if abs(arousal) < 0.2 and abs(valence) < 0.2:
        return "neutral"
    if valence >= 0 and arousal >= 0:
        return "joy"
    if valence >= 0 and arousal < 0:
        return "calm"
    if valence < 0 and arousal >= 0:
        return "anger"
    return "sadness"


def _load_audio(path: Path) -> np.ndarray:
    import librosa  # noqa: PLC0415

    wav, _sr = librosa.load(str(path), sr=_TARGET_SR, mono=True)
    return np.asarray(wav, dtype=np.float32)

from __future__ import annotations

from pathlib import Path

import numpy as np

from app.ml.errors import ModelNotAvailableError
from app.ml.model_paths import (
    AUDEERING_GENDER_ID,
    AUDEERING_GENDER_URL,
    ModelPaths,
)
from app.models.schemas import GenderRequest, GenderResponse

_TARGET_SR = 16_000


class GenderService:
    def __init__(self, paths: ModelPaths) -> None:
        self._paths = paths
        self._model = None
        self._feature_extractor = None

    def classify(self, request: GenderRequest) -> GenderResponse:
        self._ensure_loaded()
        wav = _load_audio(Path(request.audio_path))
        probabilities = self._predict(wav)
        return _to_response(probabilities)

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        model_dir = self._paths.audeering_gender()
        if model_dir is None:
            raise ModelNotAvailableError(
                model_id=AUDEERING_GENDER_ID,
                download_url=AUDEERING_GENDER_URL,
            )

        import torch  # noqa: F401, PLC0415
        from transformers import (
            AutoFeatureExtractor,
            AutoModelForAudioClassification,
        )  # noqa: PLC0415

        self._feature_extractor = AutoFeatureExtractor.from_pretrained(str(model_dir))
        self._model = AutoModelForAudioClassification.from_pretrained(str(model_dir))
        self._model.eval()

    def _predict(self, wav: np.ndarray) -> np.ndarray:
        import torch  # noqa: PLC0415

        inputs = self._feature_extractor(
            wav, sampling_rate=_TARGET_SR, return_tensors="pt"
        )
        with torch.no_grad():
            logits = self._model(**inputs).logits[0]
        return torch.softmax(logits, dim=-1).cpu().numpy()


def _to_response(probabilities: np.ndarray) -> GenderResponse:

    female_prob = float(probabilities[0]) + float(probabilities[2])
    male_prob = float(probabilities[1])
    if male_prob > female_prob:
        return GenderResponse(gender="male", confidence=male_prob)
    if female_prob > male_prob:
        return GenderResponse(gender="female", confidence=female_prob)
    return GenderResponse(gender="unknown", confidence=max(male_prob, female_prob))


def _load_audio(path: Path) -> np.ndarray:
    import librosa  # noqa: PLC0415

    wav, _sr = librosa.load(str(path), sr=_TARGET_SR, mono=True)
    return np.asarray(wav, dtype=np.float32)

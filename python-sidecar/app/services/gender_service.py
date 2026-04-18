"""Gender classification via the audeering age-gender model.

Tier-2 service (per ADR-010 §2.3) — the ~380 MB weights are **not**
bundled in the DMG. Users opt in via Settings → Models. Until then
:meth:`classify` raises :class:`ModelNotAvailableError` which the
router translates into the 503 envelope.

Model per ``plan/v0.8/02-ml-sidecar-production.md §3.3``:
``audeering/wav2vec2-large-robust-24-ft-age-gender``. Outputs are a
three-class gender head (0=female, 1=male, 2=child). Per the spec we
map ``child → female`` because the downstream note only has space for
a binary label.
"""
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
    """Loads the audeering model on first use.

    The loader raises :class:`ModelNotAvailableError` *at construction
    time* when the weights are absent so the caller can render the 503
    without doing any audio I/O.
    """

    def __init__(self, paths: ModelPaths) -> None:
        self._paths = paths
        self._model = None
        self._feature_extractor = None

    def classify(self, request: GenderRequest) -> GenderResponse:
        self._ensure_loaded()
        wav = _load_audio(Path(request.audio_path))
        probabilities = self._predict(wav)
        return _to_response(probabilities)

    # ---- internals --------------------------------------------------------

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        model_dir = self._paths.audeering_gender()
        if model_dir is None:
            raise ModelNotAvailableError(
                model_id=AUDEERING_GENDER_ID,
                download_url=AUDEERING_GENDER_URL,
            )

        # Deferred imports — torch + transformers cost ~150 MB of RAM
        # and are only required once a user has downloaded the weights.
        import torch  # noqa: F401, PLC0415
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification  # noqa: PLC0415

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
    """Collapse the 3-way head (female / male / child) to 2 labels."""

    # Class order per the audeering head (documented in the model card).
    female_prob = float(probabilities[0]) + float(probabilities[2])  # + child → female
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

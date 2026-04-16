"""Emotion classification service.

V3 implementation plan (see PYTHON-SIDECAR-SPEC §5.3):
  * Load ``audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim`` via
    :func:`AutoFeatureExtractor.from_pretrained` (NOT Wav2Vec2Processor --
    the model lacks a tokenizer, see workaround §7.3).
  * Apply the ``vocab_size`` config patch described in §7.2.
  * Model returns arousal / valence / dominance in [0, 1];
    map to a label via the thresholded rules from the spec.

Scaffold returns a neutral zero vector.
"""
from __future__ import annotations

from app.models.schemas import EmotionRequest, EmotionResponse


class EmotionService:
    """Stub emotion classification service."""

    def classify(self, request: EmotionRequest) -> EmotionResponse:
        return EmotionResponse(
            emotion="neutral",
            valence=0.0,
            arousal=0.0,
            dominance=0.0,
        )

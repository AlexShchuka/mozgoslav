"""Gender classification service.

V3 implementation plan (see PYTHON-SIDECAR-SPEC §5.2):
  * Load ``audeering/wav2vec2-large-robust-24-ft-age-gender``
    (Wav2Vec2 backbone with a 3-way gender head: 0=female, 1=male, 2=child).
  * Run inference per speaker segment, take majority vote.
  * Map 'child' -> 'female' as an approximation.

Scaffold returns ``unknown`` with zero confidence.
"""
from __future__ import annotations

from app.models.schemas import GenderRequest, GenderResponse


class GenderService:
    """Stub gender classification service."""

    def classify(self, request: GenderRequest) -> GenderResponse:
        return GenderResponse(gender="unknown", confidence=0.0)

"""Speaker diarization service.

V3 implementation plan (see PYTHON-SIDECAR-SPEC §5.1):
  1. Silero VAD -> speech timestamps.
  2. Resemblyzer -> 256-dim embedding per segment >= 0.7 s.
  3. sklearn AgglomerativeClustering (cosine, threshold=0.75) -> labels.
  4. Short segments are glued to the nearest cluster by temporal proximity.

This scaffold returns a deterministic dummy payload so the HTTP contract
and the C# client can be exercised end-to-end without the ML stack.
"""
from __future__ import annotations

from app.models.schemas import DiarizeRequest, DiarizeResponse, SpeakerSegment


class DiarizeService:
    """Stub diarization service."""

    def diarize(self, request: DiarizeRequest) -> DiarizeResponse:
        segments = [
            SpeakerSegment(speaker="A", start=0.0, end=1.5),
            SpeakerSegment(speaker="B", start=1.5, end=3.0),
        ]
        return DiarizeResponse(segments=segments, num_speakers=2)

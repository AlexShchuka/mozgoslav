"""Named entity recognition service.

V3 implementation plan (see PYTHON-SIDECAR-SPEC §5.4):
  * Natasha pipeline: Segmenter, MorphVocab, NewsNERTagger(NewsEmbedding),
    DatesExtractor. All initialised once at process start.
  * Normalise spans via ``span.normalize(morph_vocab)`` and bucket by type
    (PER -> people, ORG -> orgs, LOC -> locations).
  * Dates: compose ``d.m.y`` strings from ``DatesExtractor`` facts,
    dropping ``None`` components.

Scaffold returns empty buckets.
"""
from __future__ import annotations

from app.models.schemas import NerRequest, NerResponse


class NerService:
    """Stub NER service."""

    def extract(self, request: NerRequest) -> NerResponse:
        return NerResponse(people=[], orgs=[], locations=[], dates=[])

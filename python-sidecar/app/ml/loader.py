"""Process-wide singletons for heavy ML artefacts.

Each service pays the cold-start cost once per process and reuses the
result across every request. Keeps the router handlers thin — they only
resolve a singleton and call its ``run()`` method.

Thread safety: ``@lru_cache`` with ``maxsize=1`` is atomic under the GIL
for the common case. Background worker thread pools (uvicorn's default
``asyncio`` policy) never enter the factory concurrently in practice
because model loading happens on the first request only.
"""
from __future__ import annotations

from functools import lru_cache

from app.ml.model_paths import ModelPaths


@lru_cache(maxsize=1)
def get_model_paths() -> ModelPaths:
    """Shared :class:`ModelPaths` resolver.

    Construction is cheap (just reads env var) but pinning a single
    instance makes tests easier: a fixture can
    ``get_model_paths.cache_clear()`` between cases.
    """

    return ModelPaths()


@lru_cache(maxsize=1)
def get_diarize_service():  # noqa: ANN202 — deferred import to keep cold-start lean
    """Lazy-build the diarization service.

    The import is deferred so unit tests that inject a fake don't pay
    the cost of loading ``silero_vad`` / ``resemblyzer`` / ``sklearn``
    weights just to verify control flow.
    """

    from app.services.diarize_service import DiarizeService  # noqa: PLC0415

    return DiarizeService(get_model_paths())


@lru_cache(maxsize=1)
def get_ner_service():  # noqa: ANN202 — ditto
    from app.services.ner_service import NerService  # noqa: PLC0415

    return NerService()


@lru_cache(maxsize=1)
def get_gender_service():  # noqa: ANN202 — ditto
    from app.services.gender_service import GenderService  # noqa: PLC0415

    return GenderService(get_model_paths())


@lru_cache(maxsize=1)
def get_emotion_service():  # noqa: ANN202 — ditto
    from app.services.emotion_service import EmotionService  # noqa: PLC0415

    return EmotionService(get_model_paths())


def clear_all_caches() -> None:
    """Drop every singleton. Used by tests to re-run service initialisation."""

    get_model_paths.cache_clear()
    get_diarize_service.cache_clear()
    get_ner_service.cache_clear()
    get_gender_service.cache_clear()
    get_emotion_service.cache_clear()

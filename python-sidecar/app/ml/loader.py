from __future__ import annotations

from functools import lru_cache

from app.ml.model_paths import ModelPaths


@lru_cache(maxsize=1)
def get_model_paths() -> ModelPaths:

    return ModelPaths()


@lru_cache(maxsize=1)
def get_diarize_service():  # noqa: ANN202 — deferred import to keep cold-start lean

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

    get_model_paths.cache_clear()
    get_diarize_service.cache_clear()
    get_ner_service.cache_clear()
    get_gender_service.cache_clear()
    get_emotion_service.cache_clear()

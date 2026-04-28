from __future__ import annotations

from app.models.schemas import (
    CleanupLevel,
    CleanupRequest,
    DiarizeRequest,
    EmotionRequest,
    GenderRequest,
    NerRequest,
)
from app.services.cleanup_service import CleanupService

_ALL_STEPS = ["diarize", "gender", "emotion", "ner", "cleanup", "embed"]


class ProcessAllService:
    def __init__(
        self,
        diarize_service,
        gender_service,
        emotion_service,
        ner_service,
        cleanup_service: CleanupService,
        embed_backend,
    ) -> None:
        self._diarize = diarize_service
        self._gender = gender_service
        self._emotion = emotion_service
        self._ner = ner_service
        self._cleanup = cleanup_service
        self._embed = embed_backend

    def process(self, audio_path: str, steps: list[str] | None) -> dict:
        active = set(steps) if steps else set(_ALL_STEPS)

        diarize_result = None
        if "diarize" in active:
            diarize_result = self._diarize.diarize(
                DiarizeRequest(audio_path=audio_path)
            )

        gender_result = None
        if "gender" in active:
            from app.ml.errors import ModelNotAvailableError  # noqa: PLC0415

            try:
                gender_result = self._gender.classify(
                    GenderRequest(audio_path=audio_path)
                )
            except ModelNotAvailableError:
                gender_result = None

        emotion_result = None
        if "emotion" in active:
            from app.ml.errors import ModelNotAvailableError  # noqa: PLC0415

            try:
                emotion_result = self._emotion.classify(
                    EmotionRequest(audio_path=audio_path)
                )
            except ModelNotAvailableError:
                emotion_result = None

        ner_result = None
        raw_text = ""
        if diarize_result is not None:
            raw_text = " ".join(s.speaker for s in diarize_result.segments)

        if "ner" in active:
            ner_result = self._ner.extract(NerRequest(text=raw_text))

        cleanup_result = None
        cleaned_text = raw_text
        if "cleanup" in active:
            cleanup_result = self._cleanup.cleanup(
                CleanupRequest(text=raw_text, level=CleanupLevel.light)
            )
            cleaned_text = cleanup_result.cleaned

        embed_result = None
        if "embed" in active:
            vec = self._embed.embed(cleaned_text or raw_text)
            embed_result = {"embedding": vec, "dim": len(vec)}

        return {
            "diarize": diarize_result.model_dump() if diarize_result else None,
            "gender": gender_result.model_dump() if gender_result else None,
            "emotion": emotion_result.model_dump() if emotion_result else None,
            "ner": ner_result.model_dump() if ner_result else None,
            "cleanup": (
                cleanup_result.model_dump()
                if cleanup_result
                else {"cleaned": cleaned_text}
            ),
            "embed": embed_result,
        }

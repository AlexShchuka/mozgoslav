from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ml.loader import (
    get_diarize_service,
    get_emotion_service,
    get_gender_service,
    get_ner_service,
)
from app.services.cleanup_service import CleanupService
from app.services.embed_service import default_backend
from app.services.processall_service import ProcessAllService

router = APIRouter(prefix="/api", tags=["process-all"])


class ProcessAllRequest(BaseModel):
    audio_path: str = Field(..., description="Absolute path to a WAV audio file.")
    steps: list[str] | None = Field(
        default=None,
        description="Subset of steps to run: diarize, gender, emotion, ner, cleanup, embed. "
        "Default: all steps.",
    )


@router.post("/process-all")
def process_all(payload: ProcessAllRequest) -> dict:
    if not payload.audio_path.strip():
        raise HTTPException(status_code=422, detail="audio_path required")
    try:
        svc = ProcessAllService(
            diarize_service=get_diarize_service(),
            gender_service=get_gender_service(),
            emotion_service=get_emotion_service(),
            ner_service=get_ner_service(),
            cleanup_service=CleanupService(),
            embed_backend=default_backend(),
        )
        return svc.process(payload.audio_path, payload.steps)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

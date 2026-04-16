"""``POST /api/emotion`` — emotion classification (V3 stub)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import EmotionRequest, EmotionResponse
from app.services.emotion_service import EmotionService

router = APIRouter(prefix="/api", tags=["emotion"])


def get_service() -> EmotionService:
    return EmotionService()


@router.post("/emotion", response_model=EmotionResponse)
async def classify_emotion(
    payload: EmotionRequest,
    service: EmotionService = Depends(get_service),
) -> EmotionResponse:
    return service.classify(payload)

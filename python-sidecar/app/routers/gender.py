"""``POST /api/gender`` — per-audio gender classification (V3 stub)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import GenderRequest, GenderResponse
from app.services.gender_service import GenderService

router = APIRouter(prefix="/api", tags=["gender"])


def get_service() -> GenderService:
    return GenderService()


@router.post("/gender", response_model=GenderResponse)
async def classify_gender(
    payload: GenderRequest,
    service: GenderService = Depends(get_service),
) -> GenderResponse:
    return service.classify(payload)

"""``POST /api/diarize`` — speaker diarization endpoint (V3 stub)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import DiarizeRequest, DiarizeResponse
from app.services.diarize_service import DiarizeService

router = APIRouter(prefix="/api", tags=["diarize"])


def get_service() -> DiarizeService:
    return DiarizeService()


@router.post("/diarize", response_model=DiarizeResponse)
async def diarize(
    payload: DiarizeRequest,
    service: DiarizeService = Depends(get_service),
) -> DiarizeResponse:
    return service.diarize(payload)

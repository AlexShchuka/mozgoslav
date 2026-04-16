"""``POST /api/cleanup`` — regex filler removal (real implementation)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import CleanupRequest, CleanupResponse
from app.services.cleanup_service import CleanupService

router = APIRouter(prefix="/api", tags=["cleanup"])


def get_service() -> CleanupService:
    return CleanupService()


@router.post("/cleanup", response_model=CleanupResponse)
async def cleanup_text(
    payload: CleanupRequest,
    service: CleanupService = Depends(get_service),
) -> CleanupResponse:
    return service.cleanup(payload)

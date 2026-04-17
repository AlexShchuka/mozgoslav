"""``POST /api/diarize`` — speaker diarization (Tier 1, always available)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.ml.loader import get_diarize_service
from app.models.schemas import DiarizeRequest, DiarizeResponse

router = APIRouter(prefix="/api", tags=["diarize"])


@router.post("/diarize", response_model=DiarizeResponse)
async def diarize(
    payload: DiarizeRequest,
    service = Depends(get_diarize_service),  # noqa: ANN001 — deferred import
) -> DiarizeResponse:
    try:
        return service.diarize(payload)
    except FileNotFoundError as ex:
        raise HTTPException(status_code=404, detail=str(ex)) from ex
    except ValueError as ex:
        raise HTTPException(status_code=422, detail=str(ex)) from ex

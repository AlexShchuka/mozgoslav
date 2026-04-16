"""``POST /api/ner`` — named entity recognition (V3 stub)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import NerRequest, NerResponse
from app.services.ner_service import NerService

router = APIRouter(prefix="/api", tags=["ner"])


def get_service() -> NerService:
    return NerService()


@router.post("/ner", response_model=NerResponse)
async def extract_entities(
    payload: NerRequest,
    service: NerService = Depends(get_service),
) -> NerResponse:
    return service.extract(payload)

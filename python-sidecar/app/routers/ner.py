"""``POST /api/ner`` — Russian named entity recognition (Tier 1)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.ml.loader import get_ner_service
from app.models.schemas import NerRequest, NerResponse

router = APIRouter(prefix="/api", tags=["ner"])


@router.post("/ner", response_model=NerResponse)
async def extract_entities(
    payload: NerRequest,
    service = Depends(get_ner_service),  # noqa: ANN001 — deferred import
) -> NerResponse:
    return service.extract(payload)

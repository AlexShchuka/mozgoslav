from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import EmbedRequest, EmbedResponse
from app.services.embed_service import DIM, default_backend

router = APIRouter(prefix="/api", tags=["embed"])


@router.post("/embed", response_model=EmbedResponse)
def embed(payload: EmbedRequest) -> EmbedResponse:
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="text required")

    backend = default_backend()
    vec = backend.embed(payload.text)
    return EmbedResponse(embedding=vec, dim=DIM)

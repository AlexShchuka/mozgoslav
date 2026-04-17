"""``POST /api/embed`` — sentence-transformer batch embeddings.

Consumed by the C# backend's ``PythonSidecarEmbeddingService`` when the
user configures ``PythonSidecarBaseUrl``; falls back to the built-in
bag-of-words embedding when the sidecar is not reachable.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import EmbedRequest, EmbedResponse
from app.services.embed_service import EmbedService

router = APIRouter(prefix="/api", tags=["embed"])

_service_singleton: EmbedService | None = None


def get_service() -> EmbedService:
    """Process-wide :class:`EmbedService` so the ML model is loaded once."""

    global _service_singleton
    if _service_singleton is None:
        _service_singleton = EmbedService()
    return _service_singleton


@router.post("/embed", response_model=EmbedResponse)
async def embed(
    payload: EmbedRequest,
    service: EmbedService = Depends(get_service),
) -> EmbedResponse:
    return service.embed(payload)

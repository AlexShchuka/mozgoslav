"""``POST /api/embed`` — single-text sentence embedding.

Contract per ``ADR-007-shared.md §2.4``::

    POST /api/embed  { "text": "non-empty string" }
                  → { "embedding": [...384 floats...], "dim": 384 }

The vector is L2-normalised. The C# consumer
(``PythonSidecarEmbeddingService``) treats this shape as frozen.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import EmbedRequest, EmbedResponse
from app.services.embed_service import DIM, default_backend

router = APIRouter(prefix="/api", tags=["embed"])


@router.post("/embed", response_model=EmbedResponse)
def embed(payload: EmbedRequest) -> EmbedResponse:
    # Pydantic's ``min_length=1`` already rejects the empty string with
    # 422; guard against whitespace-only payloads here so the error shape
    # stays consistent (``{"detail": "text required"}``).
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="text required")

    backend = default_backend()
    vec = backend.embed(payload.text)
    return EmbedResponse(embedding=vec, dim=DIM)

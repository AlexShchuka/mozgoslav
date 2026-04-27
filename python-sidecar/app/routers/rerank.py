from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.rerank_service import get_reranker

router = APIRouter(prefix="/api", tags=["rerank"])


class RerankChunk(BaseModel):
    id: str
    text: str


class RerankRequest(BaseModel):
    model_id: str = Field(..., description="HuggingFace model identifier for the cross-encoder.")
    query: str = Field(..., min_length=1)
    chunks: list[RerankChunk] = Field(..., min_length=1)


class RerankItem(BaseModel):
    id: str
    score: float


@router.post("/rerank", response_model=list[RerankItem])
def rerank(payload: RerankRequest) -> list[RerankItem]:
    if not payload.query.strip():
        raise HTTPException(status_code=422, detail="query required")
    try:
        results = get_reranker().rerank(
            model_id=payload.model_id,
            query=payload.query,
            chunks=[{"id": c.id, "text": c.text} for c in payload.chunks],
        )
        return [RerankItem(id=r["id"], score=r["score"]) for r in results]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

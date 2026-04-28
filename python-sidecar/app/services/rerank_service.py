from __future__ import annotations

import threading
from typing import Protocol


class RerankResult(Protocol):
    id: str
    score: float


class CrossEncoderReranker:
    _lock = threading.Lock()
    _models: dict[str, object] = {}

    def rerank(
        self,
        model_id: str,
        query: str,
        chunks: list[dict],
    ) -> list[dict]:
        model = self._get_model(model_id)
        pairs = [(query, chunk["text"]) for chunk in chunks]
        scores = model.predict(pairs, show_progress_bar=False)
        results = [
            {"id": chunk["id"], "score": float(score)}
            for chunk, score in zip(chunks, scores)
        ]
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def _get_model(self, model_id: str) -> object:
        if model_id in self._models:
            return self._models[model_id]
        with self._lock:
            if model_id not in self._models:
                from sentence_transformers import CrossEncoder  # noqa: PLC0415

                self._models[model_id] = CrossEncoder(model_id)
        return self._models[model_id]


_reranker = CrossEncoderReranker()


def get_reranker() -> CrossEncoderReranker:
    return _reranker

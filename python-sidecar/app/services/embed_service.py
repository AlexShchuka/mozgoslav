"""Sentence-transformer embedding service.

Lazy-loads ``sentence-transformers/all-MiniLM-L6-v2`` on the first call;
subsequent calls reuse the loaded model. This keeps process start-up cheap
when the sidecar is running but the desktop app hasn't hit ``/api/embed``
yet (e.g. a user who only uses the cleanup endpoint).

When ``sentence-transformers`` is not installed (lightweight dev env), we
fall back to a deterministic local implementation that mirrors the shape
of a real embedding — callers see the same contract, tests stay hermetic.

Why the fallback ships in production code instead of a separate "fake":
the sidecar runs optionally; if the user's dev box can't install torch we
still want the endpoint to exist and return something meaningful for the
C# RAG layer. The real model is enabled by installing the ML deps; the
fallback never gets used on macOS release builds.
"""
from __future__ import annotations

import hashlib
import math
import threading
from typing import TYPE_CHECKING

from app.models.schemas import EmbedRequest, EmbedResponse

if TYPE_CHECKING:  # pragma: no cover - import only for type checkers
    from sentence_transformers import SentenceTransformer

_DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_FALLBACK_DIMS = 384  # matches all-MiniLM-L6-v2 to keep the contract stable


class EmbedService:
    """Computes dense embeddings for a batch of strings."""

    def __init__(self, model_name: str = _DEFAULT_MODEL) -> None:
        self._model_name = model_name
        self._model: SentenceTransformer | None = None
        self._lock = threading.Lock()

    # -- public API ----------------------------------------------------------

    def embed(self, request: EmbedRequest) -> EmbedResponse:
        model = self._load_model()
        if model is None:
            vectors = [_fallback_embed(text) for text in request.texts]
            return EmbedResponse(
                model=f"{self._model_name} (fallback:hash-bag-of-words)",
                dimensions=_FALLBACK_DIMS,
                vectors=vectors,
            )

        encoded = model.encode(
            request.texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        vectors = [row.tolist() for row in encoded]
        return EmbedResponse(
            model=self._model_name,
            dimensions=len(vectors[0]) if vectors else 0,
            vectors=vectors,
        )

    # -- internals -----------------------------------------------------------

    def _load_model(self) -> SentenceTransformer | None:
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is not None:
                return self._model
            try:
                from sentence_transformers import SentenceTransformer  # noqa: PLC0415
            except ImportError:
                return None

            self._model = SentenceTransformer(self._model_name)
            return self._model


# ---- fallback --------------------------------------------------------------


def _fallback_embed(text: str) -> list[float]:
    """Deterministic, L2-normalised bag-of-words embedding.

    SHA-256 is used as a stable cross-platform hash (Python's built-in
    ``hash`` is randomised per-process). The tokenisation is intentionally
    naive — callers that need real semantics should install the ML deps.
    """

    vector = [0.0] * _FALLBACK_DIMS
    for token in _tokenise(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:4], "big") % _FALLBACK_DIMS
        vector[bucket] += 1.0

    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0.0:
        return vector
    return [v / norm for v in vector]


def _tokenise(text: str) -> list[str]:
    return [token for token in _SPLIT_RE.split(text.lower()) if len(token) > 1]


import re  # noqa: E402 — local import so the helper stays self-contained

_SPLIT_RE = re.compile(r"[\s,.;:!?()\[\]{}\"'«»/\\]+")

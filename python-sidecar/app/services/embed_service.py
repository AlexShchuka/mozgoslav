"""``POST /api/embed`` implementation.

Two interchangeable backends implement the same ``EmbedBackend`` protocol:

* :class:`SentenceTransformersBackend` — loads
  ``sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`` on demand
  (process-wide double-checked singleton). Only runs on a macOS host where
  the ML dependency stack (PyTorch + sentence-transformers) is installed.
* :class:`DeterministicBoWBackend` — SHA-256-bucketed bag-of-words. Zero
  external dependencies, deterministic across processes and machines,
  used by dev boxes without PyTorch and by the hermetic pytest suite.

Both backends return 384-dim L2-normalised vectors so the C# RAG consumer
(``PythonSidecarEmbeddingService``) sees a fixed contract regardless of
install topology.
"""
from __future__ import annotations

import hashlib
import math
import threading
from functools import lru_cache
from typing import Protocol


DIM = 384


class EmbedBackend(Protocol):
    """Minimal contract every backend must honour."""

    def embed(self, text: str) -> list[float]: ...


class DeterministicBoWBackend:
    """Deterministic SHA-256-bucketed bag-of-words — zero external deps.

    Each whitespace-split token contributes a signed weight into a bucket
    chosen by the first 4 bytes of its SHA-256 digest. Byte 4's LSB
    determines the sign; byte 5 scaled into ``(0, 1]`` is the magnitude.
    The final vector is L2-normalised. Deterministic across Python
    processes because ``hashlib.sha256`` is not randomised.
    """

    def embed(self, text: str) -> list[float]:
        buckets = [0.0] * DIM
        for word in text.lower().split():
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "big") % DIM
            sign = 1.0 if digest[4] & 1 else -1.0
            weight = (digest[5] + 1) / 256.0
            buckets[bucket] += sign * weight
        return _l2_normalise(buckets)


class SentenceTransformersBackend:
    """Real multilingual embeddings. Load-on-demand + process-wide singleton.

    The actual model import stays behind the ``_load`` guard so this class
    is safe to import on a box without PyTorch; the dev-sandbox code path
    never calls ``embed`` on an instance of this class because
    :func:`default_backend` falls back to the deterministic backend when
    ``sentence_transformers`` is not importable.
    """

    _lock = threading.Lock()
    _model = None

    def embed(self, text: str) -> list[float]:
        model = self._load()
        # ``normalize_embeddings=True`` gives L2-norm vectors natively.
        vec = model.encode(text, normalize_embeddings=True).tolist()
        # paraphrase-multilingual-MiniLM-L12-v2 emits 384-dim vectors by
        # default, but guard against a model swap.
        if len(vec) != DIM:
            vec = _resize_to_dim(vec, DIM)
        return vec

    def _load(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    from sentence_transformers import SentenceTransformer  # noqa: PLC0415

                    self._model = SentenceTransformer(
                        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
                    )
        return self._model


def _l2_normalise(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0.0:
        # Stable deterministic fallback — a uniform unit vector avoids a
        # division-by-zero while keeping the contract (dim=384, ||v||=1).
        return [1.0 / math.sqrt(DIM)] * DIM
    return [v / norm for v in vec]


def _resize_to_dim(vec: list[float], target: int) -> list[float]:
    """Pad with zeros or truncate, then re-normalise — deterministic reshape."""

    if len(vec) >= target:
        out = vec[:target]
    else:
        out = vec + [0.0] * (target - len(vec))
    return _l2_normalise(out)


@lru_cache(maxsize=1)
def default_backend() -> EmbedBackend:
    """Pick the real backend if PyTorch is importable; otherwise BoW.

    Cached so both the router and any direct caller share the same
    backend instance (important for :class:`SentenceTransformersBackend`
    where ``_model`` is populated lazily on the first call).
    """

    try:
        import torch  # noqa: F401, PLC0415
        import sentence_transformers  # noqa: F401, PLC0415
    except ImportError:
        return DeterministicBoWBackend()
    return SentenceTransformersBackend()

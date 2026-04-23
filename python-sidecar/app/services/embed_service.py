from __future__ import annotations

import hashlib
import math
import threading
from functools import lru_cache
from typing import Protocol


DIM = 384


class EmbedBackend(Protocol):

    def embed(self, text: str) -> list[float]: ...


class DeterministicBoWBackend:

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

    _lock = threading.Lock()
    _model = None

    def embed(self, text: str) -> list[float]:
        model = self._load()
        vec = model.encode(text, normalize_embeddings=True).tolist()
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
        return [1.0 / math.sqrt(DIM)] * DIM
    return [v / norm for v in vec]


def _resize_to_dim(vec: list[float], target: int) -> list[float]:

    if len(vec) >= target:
        out = vec[:target]
    else:
        out = vec + [0.0] * (target - len(vec))
    return _l2_normalise(out)


@lru_cache(maxsize=1)
def default_backend() -> EmbedBackend:

    try:
        import torch  # noqa: F401, PLC0415
        import sentence_transformers  # noqa: F401, PLC0415
    except ImportError:
        return DeterministicBoWBackend()
    return SentenceTransformersBackend()

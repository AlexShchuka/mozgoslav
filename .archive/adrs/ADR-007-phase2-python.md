# ADR-007 — Phase 2 Python Sidecar Agent

Read first: `ADR-007.md`, `ADR-007-shared.md` (§2.4 defines the `/embed` contract the Backend agent depends on), `python-sidecar/CLAUDE.md`, root `CLAUDE.md`. Precondition: **Phase 1 Agent A acceptance passed**. Runs parallel to Backend / Frontend / Swift agents. Works in `python-sidecar/` only.

---

## 0. Goal and definition of done

**Goal.** Restore `POST /api/embed` so Backend MR C's `PythonSidecarEmbeddingService` can call a live sidecar on the user's Mac. In the pod, the deterministic SHA-256 BoW fallback is the only code path actually executed; sentence-transformers + PyTorch are not installed here.

**DoD commands.**

```bash
cd /home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
deactivate
```

All tests green. `requirements.txt` lists `sentence-transformers` for macOS install; `requirements-dev.txt` stays lightweight.

---

## 1. Scope

| BC | Deliverable |
|----|-------------|
| BC-039 (sidecar half of full-stack RAG) | `POST /api/embed { text: string }` → `{ embedding: number[], dim: 384 }`. Deterministic BoW fallback path is complete and tested in the pod; real-model path is implementation-ready for the user's Mac. |

---

## 2. Files

```
python-sidecar/app/routers/embed.py           (new)
python-sidecar/app/models/embed.py            (new)
python-sidecar/app/services/embed_service.py  (new)
python-sidecar/tests/test_embed.py            (new)
```

Also:
- `python-sidecar/requirements.txt` — ensure `sentence-transformers>=3.0.0` is listed for production install; leave version un-pinned to the minor, pin major.
- `python-sidecar/requirements-dev.txt` — leave untouched. The `/embed` deterministic path has no runtime dependency beyond what's already there.

Wire the router include in `python-sidecar/app/main.py`:

```python
from app.routers import embed as embed_router

def create_app() -> FastAPI:
    app = FastAPI(title="mozgoslav-sidecar")
    app.include_router(embed_router.router)
    # existing includes...
    return app
```

---

## 3. Contract

### 3.1 Request

```http
POST /api/embed HTTP/1.1
Content-Type: application/json

{ "text": "any non-empty string" }
```

### 3.2 Response (200)

```json
{
    "embedding": [0.0123, -0.0456, ... 384 floats],
    "dim": 384
}
```

- Output is **L2-normalised** (Euclidean norm equal to 1.0 within `1e-5`).
- Dimension is **fixed at 384** across both real-model and deterministic paths — the C# consumer must never see a contract change.

### 3.3 Error (400 / 422)

- Empty `text` → 422 `{"detail":"text required"}`.
- Non-JSON body → 400 default FastAPI validation error.

### 3.4 Response (500)

Any internal exception inside the fallback path is a **defect** — the fallback must never fail on valid input.

---

## 4. Implementation

### 4.1 Pydantic schemas

`python-sidecar/app/models/embed.py`:

```python
from pydantic import BaseModel, Field

class EmbedRequest(BaseModel):
    text: str = Field(min_length=1)

class EmbedResponse(BaseModel):
    embedding: list[float]
    dim: int
```

### 4.2 Service (with load-on-demand singleton for real model)

`python-sidecar/app/services/embed_service.py`:

```python
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
    """Deterministic SHA-256-bucketed bag-of-words — zero external deps."""

    def embed(self, text: str) -> list[float]:
        buckets = [0.0] * DIM
        for word in text.lower().split():
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            # 4 bytes → int → mod DIM
            bucket = int.from_bytes(digest[:4], "big") % DIM
            # Use bytes 4..8 for weight (±)
            sign = 1.0 if digest[4] & 1 else -1.0
            weight = (digest[5] + 1) / 256.0
            buckets[bucket] += sign * weight
        return _l2_normalise(buckets)


class SentenceTransformersBackend:
    """Real multilingual embeddings. Load-on-demand + process-wide singleton."""

    _lock = threading.Lock()
    _model = None

    def embed(self, text: str) -> list[float]:
        model = self._load()
        vec = model.encode(text, normalize_embeddings=True).tolist()
        # sentence-transformers models may not be 384-dim by default; coerce.
        if len(vec) != DIM:
            vec = _resize_to_dim(vec, DIM)
        return vec

    def _load(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    from sentence_transformers import SentenceTransformer  # optional dep
                    # Target model (multilingual, 384-dim): paraphrase-multilingual-MiniLM-L12-v2
                    self._model = SentenceTransformer(
                        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
                    )
        return self._model


def _l2_normalise(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0.0:
        # Fallback vector — avoids division by zero; stable, deterministic.
        return [1.0 / math.sqrt(DIM)] * DIM
    return [v / norm for v in vec]


def _resize_to_dim(vec: list[float], target: int) -> list[float]:
    # Deterministic reshape: pad with zeros or truncate, then re-normalise.
    if len(vec) >= target:
        out = vec[:target]
    else:
        out = vec + [0.0] * (target - len(vec))
    return _l2_normalise(out)


@lru_cache(maxsize=1)
def default_backend() -> EmbedBackend:
    """Pick the real backend if PyTorch is importable; otherwise BoW."""
    try:
        import torch  # noqa: F401
        import sentence_transformers  # noqa: F401
        return SentenceTransformersBackend()
    except ImportError:
        return DeterministicBoWBackend()
```

### 4.3 Router

`python-sidecar/app/routers/embed.py`:

```python
from fastapi import APIRouter, HTTPException

from app.models.embed import EmbedRequest, EmbedResponse
from app.services.embed_service import DIM, default_backend

router = APIRouter()


@router.post("/api/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text required")
    backend = default_backend()
    vec = backend.embed(req.text)
    return EmbedResponse(embedding=vec, dim=DIM)
```

### 4.4 Tests

`python-sidecar/tests/test_embed.py`:

```python
import math

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.embed_service import DIM, DeterministicBoWBackend


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_embed_happy_path_returns_384_dim_l2_normalised(client: TestClient) -> None:
    res = client.post("/api/embed", json={"text": "привет, мир"})
    assert res.status_code == 200
    data = res.json()
    assert data["dim"] == DIM
    vec = data["embedding"]
    assert len(vec) == DIM
    norm = math.sqrt(sum(v * v for v in vec))
    assert math.isclose(norm, 1.0, abs_tol=1e-5)


def test_embed_empty_text_returns_422(client: TestClient) -> None:
    res = client.post("/api/embed", json={"text": ""})
    assert res.status_code == 422


def test_embed_whitespace_only_returns_422(client: TestClient) -> None:
    res = client.post("/api/embed", json={"text": "   "})
    assert res.status_code == 422


def test_embed_deterministic_bow_same_text_same_vector() -> None:
    # The pod path — real model is not installed; guarantees reproducibility.
    backend = DeterministicBoWBackend()
    v1 = backend.embed("repeatable input")
    v2 = backend.embed("repeatable input")
    assert v1 == v2


def test_embed_deterministic_bow_different_texts_different_vectors() -> None:
    backend = DeterministicBoWBackend()
    v1 = backend.embed("alpha bravo")
    v2 = backend.embed("charlie delta")
    assert v1 != v2
```

---

## 5. Acceptance checklist

- [ ] `python -m pytest -q` — all tests green.
- [ ] `curl -X POST http://127.0.0.1:5060/api/embed -H "Content-Type: application/json" -d '{"text":"hello"}'` (started with `uvicorn app.main:app --port 5060`) returns a 384-dim array, L2-normalised.
- [ ] Response shape matches `ADR-007-shared.md §2.4` and Backend agent's `PythonSidecarEmbeddingService` client.
- [ ] `requirements.txt` lists `sentence-transformers` at a compatible version; `requirements-dev.txt` unchanged.
- [ ] `phase2-python-report.md` at repo root: what was added, tests, open items (e.g. «real-model path untested in sandbox; tested deterministic fallback»).

---

## 6. Escalation triggers

- Existing Python tests break — stop, a stub router was probably sharing a path. Review `app/main.py` include order.
- `sentence-transformers` import inside `_load()` crashes the dev box — leave it behind the `ImportError` guard; do not install in dev.
- Backend C# integration test for RAG fails because embedding shape differs — escalate to Backend agent; the contract (`dim=384`, L2-normalised) is frozen.

---

## 7. Skills

- `superpowers:test-driven-development` (mandatory).
- `superpowers:verification-before-completion` (mandatory).
- `superpowers:systematic-debugging` (if deterministic normalisation drifts under edge-case inputs).

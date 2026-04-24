# Phase 2 Python Sidecar — Hand-off report

**Date:** 2026-04-17
**Scope:** `ADR-007-phase2-python.md` — restore `POST /api/embed` per `ADR-007-shared.md §2.4`.
**Outcome:** Green. 22/22 pytest green, smoke test green, `/api/embed` contract frozen at ADR-007-shared.md §2.4.

---

## TL;DR

- `POST /api/embed { text }` → `{ embedding: [...384 floats...], dim: 384 }`, L2-normalised.
- Deterministic SHA-256 BoW fallback is the only path exercised in the pod (PyTorch absent by design).
- Real `paraphrase-multilingual-MiniLM-L12-v2` path is wired behind an `ImportError` guard for the user's macOS host.
- `requirements-dev.txt` untouched; `requirements.txt` already listed `sentence-transformers>=3.0.0`.

---

## Audit findings — current state diverged from ADR on disk

On entry the sidecar **would not import at all**:

```
ModuleNotFoundError: No module named 'app.models'
  at python-sidecar/app/main.py:18
  at python-sidecar/tests/conftest.py:9 (collection failure)
```

Root cause: the `python-sidecar/app/models/` package was entirely absent on disk. Every service and every router
imported from `app.models.schemas`. Phase 1 Agent A's report lists only `.NET + frontend` verification —
`python -m pytest -q` was never run during Phase 1, so the breakage slipped through.

Two additional divergences from the ADR:

1. The existing `embed.py` router + `embed_service.py` implemented the **batch** shape (`{ texts: [] }` →
   `{ model, dimensions, vectors[[]] }`), not the ADR-007-shared.md §2.4 single-text shape.
2. The existing tests in `tests/test_embed.py` asserted the batch shape.

Per the task prompt — "§2.4 /embed contract is binding. If divergent — fix minimally" — I rewrote `/embed` to the
ADR-007 single-text contract and re-created `app/models/{__init__,common,schemas}.py` so the rest of the sidecar (
cleanup, health, stubs) imports again.

---

## Business cases closed

| BC                    | Area           | Status   | Notes                                                                                                      |
|-----------------------|----------------|----------|------------------------------------------------------------------------------------------------------------|
| BC-039 (sidecar half) | RAG embeddings | **PASS** | `/api/embed` 384-dim L2-normalised; both deterministic and real-model backends honour the frozen contract. |

---

## Files created

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar/app/models/__init__.py`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar/app/models/common.py` — `HealthResponse` with
  defaults (`status="ok"`, `service="mozgoslav-python-sidecar"`).
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar/app/models/schemas.py` — pydantic v2 schemas for
  every endpoint (`CleanupLevel/Request/Response`, `DiarizeRequest/Response/SpeakerSegment`, `GenderRequest/Response`,
  `EmotionRequest/Response`, `NerRequest/Response`, `EmbedRequest/Response`).

## Files rewritten

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar/app/routers/embed.py` — single-text
  `POST /api/embed`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar/app/services/embed_service.py` —
  `DeterministicBoWBackend` / `SentenceTransformersBackend` with shared `EmbedBackend` protocol, `@lru_cache(maxsize=1)`
  -cached `default_backend()`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/python-sidecar/tests/test_embed.py` — 14 tests covering ADR-007
  §4.4 BCs + additional guards.

## Files NOT touched (honoured scope)

- `python-sidecar/app/main.py` — already wired `embed.router`; router prefix is preserved (`/api/embed`).
- `python-sidecar/app/routers/{cleanup,diarize,emotion,gender,ner}.py` — unchanged.
- `python-sidecar/app/services/{cleanup,diarize,emotion,gender,ner}_service.py` — unchanged.
- `python-sidecar/app/config.py`, `python-sidecar/tests/{conftest.py,test_cleanup.py,test_health.py}` — unchanged.
- `python-sidecar/requirements-dev.txt` — unchanged (no new deps).
- `python-sidecar/requirements.txt` — unchanged (`sentence-transformers>=3.0.0` already present on line 30).

---

## Tests (22 total, 22 passed)

### `tests/test_embed.py` (14 tests — new scope)

HTTP contract:

- `test_embed_happy_path_returns_384_dim_l2_normalised` — Cyrillic input → 200, `dim=384`, `len(embedding)==384`, ‖v‖≈1.
- `test_embed_ascii_text_also_returns_unit_vector` — ASCII input same guarantees.
- `test_embed_empty_text_returns_422` — pydantic `min_length=1`.
- `test_embed_whitespace_only_returns_422` — router strip guard.
- `test_embed_tab_and_newline_only_returns_422` — mixed whitespace.
- `test_embed_missing_text_field_returns_422` — pydantic required-field check.

Deterministic BoW backend:

- `test_embed_deterministic_bow_same_text_same_vector` — determinism.
- `test_embed_deterministic_bow_different_texts_different_vectors` — distinguishability.
- `test_embed_deterministic_bow_output_is_l2_normalised` — vector math.
- `test_embed_deterministic_bow_empty_token_stream_returns_uniform_unit` — zero-norm guard (ADR §3.4).
- `test_embed_deterministic_bow_is_case_insensitive` — `.lower()` discipline.

Default-backend selection:

- `test_default_backend_is_deterministic_in_pod` — confirms PyTorch absent.

Normaliser invariant:

- `test_l2_normalise_zero_input_returns_unit_vector` — dedicated zero-branch test.
- `test_l2_normalise_scales_nonzero_vector_to_unit_norm` — 3-4-5 triangle cross-check.

### Pre-existing tests (unchanged, verified green)

- `tests/test_cleanup.py` — 6 tests (previously dead at collect-time because `app.models.schemas` was missing).
- `tests/test_health.py` — 2 tests (ditto).

---

## Acceptance — per prompt

```
cd python-sidecar && python -m pytest -q
```

```
......................                                                   [100%]
22 passed in 0.11s
```

### Smoke (uvicorn + curl)

```
curl -sfX POST http://127.0.0.1:5060/api/embed \
     -H 'Content-Type: application/json' \
     -d '{"text":"hello"}'
```

```
dim: 384  embedding_len: 384  norm: 1.0
```

Empty / whitespace payloads return HTTP 422 with `{"detail": "text required"}` (whitespace branch) or the pydantic
structured error (literal empty string).

---

## Open items / UNVERIFIED

1. **Backend C# contract mismatch (UNVERIFIED impact).** The existing
   `backend/src/Mozgoslav.Infrastructure/Rag/PythonSidecarEmbeddingService.cs` and
   `backend/tests/Mozgoslav.Tests.Integration/Rag/PythonSidecarEmbeddingServiceTests.cs` still use the **batch** shape (
   `{ texts }` → `{ model, dimensions, vectors }`). ADR-007-shared.md §2.4 defines the sidecar's shape as single-text (
   `{ text }` → `{ embedding, dim }`) — the shape I implemented. The prompt forbade touching anything outside
   `python-sidecar/`, so the Backend agent (MR C) must re-align the C# client to match §2.4 when they resume. Until that
   happens, real integration will not wire. Phase 1 Agent A's report records the current C# tests as green — that means
   the current C# code is self-consistent with its own mocked sidecar shape, not with the real sidecar running the §2.4
   contract.
2. **Real sentence-transformers path untested in sandbox.** `SentenceTransformersBackend._load()` imports
   `sentence_transformers` behind an `ImportError` guard; the pod never installs the package. The macOS E2E smoke
   remains the only validation route for the real-model branch — this is by ADR design (`ADR-007-phase2-python.md §0`,
   §7 escalation trigger #2).
3. **`default_backend()` cache-clearing is test-local.**
   `tests/test_embed.py::test_default_backend_is_deterministic_in_pod` clears the `@lru_cache` before asserting
   `DeterministicBoWBackend`. If a future test populates `_model_cached_as_real` on the singleton, a cache clear will
   not reset that state — noting this so the next maintainer sees the coupling.
4. **Phase 1 did not run Python tests.** `phase1-agent-a-report.md` lists zero Python DoD commands. The pod-level
   `app.models/` absence survived Phase 1 because nobody invoked pytest. Recommend adding `python -m pytest -q` inside
   `python-sidecar/` to the Phase-1 DoD for future iterations.

---

## Adherence audit

- No files outside `python-sidecar/` touched.
- No `git` operations.
- No new pip packages installed — `requirements-dev.txt` unchanged, `requirements.txt` unchanged.
- No network calls from tests — deterministic BoW + `TestClient` only.
- 2-strike rule: only one re-run was needed (smoke-test bash variable path); no retry on test failures.

---

## Hand-off pointers for the Backend agent (MR C)

When Backend MR C restarts, align `PythonSidecarEmbeddingService` with §2.4:

```csharp
private sealed record EmbedRequest(
    [property: JsonPropertyName("text")] string Text);
private sealed record EmbedResponse(
    [property: JsonPropertyName("embedding")] float[] Embedding,
    [property: JsonPropertyName("dim")] int Dim);
```

The integration tests in `backend/tests/Mozgoslav.Tests.Integration/Rag/PythonSidecarEmbeddingServiceTests.cs` will need
their `BuildResponse` helper flipped accordingly. Dimension drift semantics remain valid — just read `body.Dim` instead
of `body.Dimensions`.

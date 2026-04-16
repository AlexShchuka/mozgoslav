# Agent Report — Python Sidecar Scaffold

## What's implemented

- FastAPI application factory (`app/main.py`) with:
  - `GET /health` returning `{status, version, service}`.
  - Permissive dev CORS.
  - Router includes for all five endpoints.
- Pydantic v2 schemas in `app/models/schemas.py` (requests + responses)
  plus shared types in `app/models/common.py`.
- Services, one class per task (`app/services/`):
  - `DiarizeService`, `GenderService`, `EmotionService`,
    `NerService` — V3 stubs; each returns a hardcoded contract-shaped
    payload and carries a module docstring that explains the exact
    V3 implementation plan from the spec.
  - `CleanupService` — **real** implementation of the Light /
    Aggressive / None regex filler cleanup dictionary from
    `DEFAULT-CONFIG.md` §7.
- Routers, one file per endpoint, with DI-provided service
  dependencies for easy testing.
- `requirements.txt` carrying the full ML stack at the versions
  specified in `DEFAULT-CONFIG.md` §4.
- `requirements-dev.txt` with the minimum needed to run the scaffold:
  fastapi, uvicorn[standard], pydantic, pydantic-settings, pytest,
  httpx.
- `pyproject.toml` (metadata + pytest config), `.python-version`
  (3.11), README, TODO.
- Tests (`tests/`):
  - `test_health.py` — 2 tests: status code + payload shape.
  - `test_cleanup.py` — 6 tests: service-level fillers, duplicates,
    none/aggressive levels, and an HTTP roundtrip through the
    router.

## Install / test status

Verified in a local `.venv` with `requirements-dev.txt`:

```
python -c "from app.main import app; print('imports ok')"  ->  imports ok
python -m pytest tests -v                                   ->  8 passed in 0.03s
```

Every endpoint was also smoke-tested via `TestClient`:

| Endpoint           | Status | Payload example                                                     |
|--------------------|--------|---------------------------------------------------------------------|
| GET /health        | 200    | `{status: ok, version: 0.1.0, service: mozgoslav-python-sidecar}`   |
| POST /api/cleanup  | 200    | `{cleaned: "привет"}` (from `ну вот типа привет`)                   |
| POST /api/diarize  | 200    | 2-speaker stub                                                      |
| POST /api/gender   | 200    | `{gender: unknown, confidence: 0.0}`                                |
| POST /api/emotion  | 200    | `{emotion: neutral, valence: 0, arousal: 0, dominance: 0}`          |
| POST /api/ner      | 200    | empty buckets                                                       |

The production `requirements.txt` is declared only — not installed in
the sandbox, per the scaffold brief (combined footprint ~4 GB).

## TODO (V3)

See `TODO.md`. Summary:

1. Real `DiarizeService` — Silero VAD + Resemblyzer + AgglomerativeClustering.
2. Real `GenderService` — audeering age-gender Wav2Vec2.
3. Real `EmotionService` — audeering emotion Wav2Vec2 with `vocab_size` patch
   and `AutoFeatureExtractor` workaround.
4. Real `NerService` — Natasha pipeline.
5. `app/ml/loader.py` + `app/ml/patches.py` for lazy model caching and
   the documented HuggingFace workarounds.
6. Optional `POST /api/process-all` aggregate endpoint.
7. `tests/fixtures/short_audio.wav` for integration-level audio tests.

## Decisions beyond the spec

- **JSON bodies only** (not multipart). The brief mandates JSON
  everywhere; the sidecar and C# backend share the local filesystem,
  so audio endpoints accept an `audio_path` string. The spec's
  multipart upload variant is listed in `TODO.md` in case the
  contract evolves.
- **`pydantic-settings`** added to `requirements-dev.txt` (pydantic v2
  split `BaseSettings` out of core pydantic). Still a light dep.
- **`uvicorn[standard]`** (not bare `uvicorn`) so that `--reload`
  works out of the box during dev.
- **`/health` shape extended** to `{status, version, service}` instead
  of `{status}` only; the extra fields help the C# client distinguish
  the sidecar from any other localhost service and surface version
  skew early. Still 200, still trivially parsed.
- **`CleanupLevel` is a proper enum** (`none`/`light`/`aggressive`);
  invalid values yield a 422 automatically via pydantic.
- **Aggressive cleanup regex** is built with longest-first
  alternation so `"ну вот"` wins over `"ну"` alone, preserving the
  intent of the composite entries in `DEFAULT-CONFIG.md` §7.
- **Python 3.12** used for sandbox verification; `.python-version`
  still pins 3.11 as the macOS target. Code uses
  `from __future__ import annotations` and no 3.12-only features.

---

The sidecar scaffold runs, imports cleanly, and passes 8/8 tests; only
the cleanup endpoint is real, the rest are V3 stubs documented in TODO.md.

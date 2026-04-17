# Block 2 — ML sidecar: production implementations

- **Block owner:** developer agent.
- **Mac validation required:** partial (model download path on Mac).
- **Depends on:** Block 1 (green CI baseline), ADR-009 §2.1 lines 2–5, ADR-010 Tier 1/2 schema.
- **Unblocks:** Block 4 (Onboarding references the new Models catalogue), Block 7 (DMG bundles minimum models).

---

## 1. Context

`python-sidecar/app/routers/{diarize,gender,emotion,ner}.py` currently serve **four stubs** that return hardcoded payloads with the correct wire shape. This was useful during scaffold (C# client and frontend could be developed in parallel). Per ADR-009, it must stop.

Reference implementations are specified in `docs/original-idea/PYTHON-SIDECAR-SPEC.md` §5 and already transcribed into `python-sidecar/TODO.md`. This plan operationalises that spec.

## 2. Target architecture

### 2.1 Endpoint status after Block 2

| Endpoint | Tier 1 (bundled-model-present) | Tier 2 (model-absent) |
|---|---|---|
| `POST /api/diarize` | 200 — real silero VAD + Resemblyzer + agglomerative clustering | 503 with `{ "error": "diarization_model_not_installed", "download_url": "..." }` |
| `POST /api/ner` | 200 — real Natasha pipeline | (Natasha model artefacts ship in bundle; always 200) |
| `POST /api/gender` | 200 — real audeering gender | 503 with download hint (audeering is Tier 2, default absent) |
| `POST /api/emotion` | 200 — real audeering emotion | 503 with download hint (audeering is Tier 2, default absent) |
| `POST /api/process-all` (optional per spec §4) | 200 (composes above) | 503 if any sub-model absent |

### 2.2 Model layout on disk

```
~/Library/Application Support/Mozgoslav/models/
├── whisper-small-q5_0.bin         (Tier 1 — bundled via fetch-bundle-models.sh)
├── ggml-silero-v6.2.0.bin         (Tier 1 — bundled)
├── silero_vad.onnx                (Tier 1 — bundled; for python-sidecar diarize)
├── resemblyzer-state.pt           (Tier 1 — bundled; speaker embedder)
├── natasha-cache/                 (Tier 1 — pip-resolved at startup; no manual download)
├── audeering-age-gender/          (Tier 2 — downloaded via Models page)
│   ├── model.safetensors
│   ├── config.json
│   └── …
└── audeering-emotion/             (Tier 2 — downloaded)
    ├── …
```

### 2.3 Model discovery contract (new)

`python-sidecar/app/ml/model_paths.py` — single module that resolves paths:

```python
class ModelPaths:
    def __init__(self, root: Path): ...
    def silero_vad(self) -> Path: ...              # → root/silero_vad.onnx or bundled fallback
    def resemblyzer_state(self) -> Path: ...
    def audeering_gender(self) -> Path | None: ... # None if not downloaded
    def audeering_emotion(self) -> Path | None: ...
```

Root resolves from env: `MOZGOSLAV_MODELS_DIR` (set by Electron launcher) or default `~/Library/Application Support/Mozgoslav/models/`. Bundled models live alongside Tier 2 downloads in the same directory — the distinction is purely about *when* they arrive on disk.

## 3. Real implementations (per `PYTHON-SIDECAR-SPEC §5` and pinned library versions)

### 3.1 `diarize_service.py`

```python
class DiarizeService:
    def __init__(self, paths: ModelPaths, vad_min_speech_s: float = 0.5): ...

    def run(self, audio_path: Path) -> DiarizeResult:
        # 1. Load silero VAD (onnxruntime). Segment speech.
        # 2. For each segment ≥ 0.7s, compute Resemblyzer embedding.
        #    Short segments (< 0.7s) are glued to the nearest cluster by time.
        # 3. AgglomerativeClustering(metric="cosine", distance_threshold=0.75).
        # 4. Produce segments list: [{ start, end, speaker }].
```

Dependencies (pin in `requirements.txt`): `silero-vad==0.6.2`, `resemblyzer==0.1.5`, `scikit-learn==1.4.*`, `onnxruntime==1.17.*`.

### 3.2 `ner_service.py`

```python
class NerService:
    def __init__(self): ...  # pipeline initialized lazily at first call

    def run(self, text: str) -> NerResult:
        # Natasha Segmenter → MorphVocab → NewsNERTagger(NewsEmbedding).
        # Buckets: people, orgs, locations, dates (d.m.y via DatesExtractor).
```

Dependencies: `natasha==1.6.*`, `razdel==0.5.*`, `slovnet==0.6.*`, `navec==0.10.*`. Natasha is pure-Python and ships its model artefacts via the pip package — no separate download.

### 3.3 `gender_service.py`

```python
class GenderService:
    def __init__(self, paths: ModelPaths):
        model_dir = paths.audeering_gender()
        if model_dir is None:
            raise ModelNotAvailableError("audeering-age-gender", download_url=...)
        # Load with custom AgeGenderModel / AgeGenderHead classes (§5.2).

    def run(self, audio_path: Path) -> GenderResult:
        # Per-segment inference, majority vote per speaker, child→female mapping.
```

Dependencies: `transformers==4.40.*`, `torch==2.2.*` (CPU-only wheel on arm64 macOS). Torch is the heaviest dep — ~150 MB install.

### 3.4 `emotion_service.py`

```python
class EmotionService:
    def __init__(self, paths: ModelPaths):
        model_dir = paths.audeering_emotion()
        if model_dir is None:
            raise ModelNotAvailableError("audeering-emotion", download_url=...)
        # Load via AutoFeatureExtractor.from_pretrained with the vocab_size=None patch (spec §7.2/§7.3).

    def run(self, audio_path: Path) -> EmotionResult:
        # Arousal/valence → label (joy / sadness / anger / fear / neutral / etc.).
```

### 3.5 `ml/loader.py`

`@lru_cache` singletons for every model so cold-start cost is paid once per process. One cache per model family. Exposed to DI via `Depends` in FastAPI routers.

### 3.6 `ml/patches.py`

The `_safe_cfg()` helper for audeering emotion config (spec §7.2). Isolated in one module so upstream upstream fixes make it easy to delete.

### 3.7 Error envelope (new — contract with C# client)

For Tier 2 models not yet installed:

```json
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
{
  "error": "model_not_installed",
  "model_id": "audeering-age-gender",
  "download_url": "https://huggingface.co/audeering/wav2vec2-large-robust-24-ft-age-gender",
  "hint": "Download via Settings → Models or the Onboarding wizard."
}
```

C# client (`PythonSidecarClient` under `Mozgoslav.Infrastructure`) surfaces this as a typed result; frontend Queue UI renders the hint near the affected job.

## 4. Testing strategy — CI does not touch Hugging Face

### 4.1 Unit tests (python-sidecar)

- `test_diarize_service.py` — fake `ModelPaths` pointing at an injectable `FakeSileroVad` + `FakeEmbedder`. Verify clustering produces stable speaker IDs across invocations, short segments are glued, segments-with-single-speaker do not fracture.
- `test_ner_service.py` — uses the real Natasha (pip-resolved, fast). Asserts that a Russian sample sentence extracts expected entities.
- `test_gender_service.py`, `test_emotion_service.py` — verify the `ModelNotAvailableError` path when the model dir is absent. When dir is present with a stubbed file, verify the service attempts to load and reports load errors clearly (without crashing the process).

### 4.2 Integration tests (sidecar + C# backend)

New project `python-sidecar/tests/integration/` using Testcontainers **from C# side** — `Mozgoslav.Tests.Integration` spins up a sidecar container (built from a test Dockerfile that skips audeering) and asserts the contract:

```
[TestMethod]
public async Task Diarize_RealSidecar_ReturnsSegmentsWithSpeakers() { ... }

[TestMethod]
public async Task Gender_WhenModelAbsent_Returns503WithTypedEnvelope() { ... }
```

The test Dockerfile (`python-sidecar/Dockerfile.test`) installs `silero-vad`, `resemblyzer`, `natasha`, `transformers`, `torch` (cpu) but does **not** download audeering. This keeps CI < 3 min and fully deterministic.

### 4.3 Production Dockerfile (reference only — not used in v0.8)

ADR-009 scope does not containerise the sidecar for production. Sidecar still runs as a subprocess of the Electron app. `Dockerfile.test` is for CI only.

## 5. Onboarding integration (bridge to Block 4)

- `POST /api/models/download` in C# backend gains `audeering-age-gender`, `audeering-emotion`, `antony66-whisper-ru` catalogue entries with `ModelTier.Downloadable` (per ADR-010 §2.5).
- Onboarding Models step (Block 4) renders:
  - Bundled entries as "✓ included".
  - `antony66` as a recommended upgrade (one-click).
  - Audeering gender/emotion as optional advanced downloads with size and description.

## 6. Tasks

1. Refactor `python-sidecar/app/routers/*` to dependency-inject services (`Depends`) instead of importing stubs directly.
2. Implement `ml/loader.py` with `@lru_cache` singletons.
3. Implement `ml/model_paths.py` with env-var resolution.
4. Implement each service (`diarize`, `ner`, `gender`, `emotion`) per §3.
5. Update `requirements.txt` with pinned deps; `requirements-dev.txt` unchanged.
6. Write unit tests per §4.1.
7. Write C# integration tests under `Mozgoslav.Tests.Integration` using Testcontainers spinning up `Dockerfile.test`.
8. Update `python-sidecar/app/main.py` startup banner to log which models are available on boot (info-level).
9. Extend `Mozgoslav.Infrastructure.Services.PythonSidecarClient` to surface `503 model_not_installed` as a typed `SidecarModelUnavailableException`.
10. Update `ModelCatalog` (C#) with new entries per ADR-010 §2.3–§2.4.
11. Update `POST /api/models/download` to accept the new ids and route to HF URL for Tier 2.
12. Commit per area: `feat(ml-sidecar): real diarize+ner impls`, `feat(ml-sidecar): audeering gender+emotion with gated 503`, `feat(models): catalogue + download paths for Tier 2`, `test(integration): sidecar end-to-end`.

## 7. Acceptance criteria

- All four endpoints respond correctly with real implementations when models are present.
- Tier 2 endpoints return the typed 503 envelope with a download URL when model is absent.
- `python-sidecar/` unit tests and C# integration tests all pass.
- No stub file remains under `python-sidecar/app/services/`. `app/services/__init__.py` docstring updated.
- Natasha extracts real Russian entities (integration test with a known RU sentence).

## 8. Non-goals

- GigaAM-v3 integration (Phase 2 — needs separate NeMo inference stack).
- Live streaming diarization (batch-only in v0.8).
- `process-all` composition endpoint (optional per spec; defer to Phase 2 unless it falls out of the implementation naturally).
- Containerising the sidecar for production.

## 9. Open questions (agent flags if hit)

- `torch==2.2.*` CPU wheel on arm64 macOS adds ~150 MB to Python env. Acceptable per spec — shuka confirms by running the resulting sidecar once locally.
- `silero-vad` ships model weights in the pip package — those count toward bundle? No, pip manages them; `MOZGOSLAV_MODELS_DIR/silero_vad.onnx` is an explicit override for users who want a custom VAD. Keep the bundled file.
- If `resemblyzer-state.pt` is too large for comfortable bundle (>100 MB), fall back to the smaller `speechbrain/spkrec-ecapa-voxceleb` (~15 MB) — decision on first Mac pass.

## 10. Mac validation checklist (minimal)

After agent push, shuka:

1. Pulls branch, runs `cd python-sidecar && source .venv/bin/activate && pytest` — must pass.
2. Runs `cd backend && dotnet test Mozgoslav.sln -maxcpucount:1 --filter FullyQualifiedName~PythonSidecar` — must pass.
3. Starts the app, imports a 30s RU audio sample, confirms diarize segments appear and NER extracts at least one person/org from the transcript.
4. Goes to Settings → Models, downloads audeering-age-gender, confirms gender endpoint flips from 503 to 200 after download completes.
5. Reports back.

---

## 11. Checkpoint summary (Agent B, 2026-04-17)

- Real implementations shipped (from commit `61d1124` forward): `diarize_service.py`, `ner_service.py`, `gender_service.py`, `emotion_service.py`, `ml/loader.py`, `ml/model_paths.py`, `ml/patches.py`, `ml/errors.py`, routers wired via `Depends`, startup banner logs model availability.
- Python unit tests: 53 pass end-to-end (`test_diarize.py`, `test_ner.py`, `test_gender.py`, `test_emotion.py`, `test_model_paths.py`, plus existing cleanup / health / embed / conftest).
- Backend surface: `IPythonSidecarClient`, `PythonSidecarClient`, `SidecarModelUnavailableException`, value objects in `Mozgoslav.Domain.ValueObjects/Sidecar*.cs`, `ModelCatalog` + `ModelTier` + `CatalogEntry` + `ModelKind` Tier 1/Tier 2 entries, `IAppPaths.BundleModelsDir`.
- WireMock-based integration tests: `PythonSidecarClientTests` (happy path, 503 envelope, network-down — 6 methods). Docker-gated tests: `SidecarContainerTests` (present in tree, **not** run locally per §4.2; CI executes them on the macos-latest runner).
- Open: Block 2 waits on shuka Mac validation per §10 (sidecar + backend tests + first diarize/NER on real audio).


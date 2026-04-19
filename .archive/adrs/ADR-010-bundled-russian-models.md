# ADR-010 — Bundled Russian models + upgrade path

- **Status:** Proposed (pending user review).
- **Date:** 2026-04-17.
- **Supersedes:** none.
- **Related:** ADR-001 (vision §10 pipeline), ADR-007 (onboarding), `README.md` Models section, `ModelDownloadService`,
  `ModelCatalog`, `BACKEND-SPEC §4`.
- **One-line summary:** ship the DMG with a small, good-enough Russian STT/NER bundle so the app works out of the box
  with zero downloads, and surface a clear upgrade path to the top-tier models (antony66, audeering, GigaAM) through
  Onboarding.

---

## 1. Context

### 1.1 Today's model story

| Domain                                 | State in code                                                                                                                                      | User cost to use today                                                                |
|----------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| Whisper STT                            | `ModelCatalog` lists `ggml-large-v3-q8_0.bin` (~1.5 GB), `ggml-large-v3-turbo-q8_0.bin` (~0.9 GB), `ggml-medium-q8_0.bin` (~0.5 GB). None bundled. | Download one from the Models page before any transcription works.                     |
| Silero VAD                             | `ggml-silero-v6.2.0.bin` (~4 MB), referenced but not bundled                                                                                       | Download.                                                                             |
| Python ML (diarize/gender/emotion/NER) | Stubs. No models in the repo.                                                                                                                      | Nothing — the stubs return fake data.                                                 |
| LLM                                    | External (LM Studio / Ollama). The app does not download LLM.                                                                                      | User runs LM Studio, points Settings → LLM at `localhost:1234`. No change in ADR-010. |

### 1.2 Problem

- First-run experience is "read README → install LM Studio → download 1.5 GB Whisper → wait → point app at it → maybe it
  works." Friction is high, motivation to try drops.
- User explicitly asked: «запечь в образ модели, положить в GitHub, самые маленькие, на русском языке, хорошие — чтобы
  онбординг был простой и можно было ничего не качать».
- We still need the top-tier models (antony66 whisper RU 6.39% WER, audeering, GigaAM) accessible — those are the models
  we have been optimising around.

Two requirements pull in opposite directions: zero-download first run **vs** top-tier quality default. The answer is a
two-tier system.

---

## 2. Decision

### 2.1 Two-tier model distribution

**Tier 1 — Bundled (ships inside the DMG, ~300-400 MB total).** Minimum viable Russian-language experience. Works
offline after first install with no further downloads.

**Tier 2 — Downloadable (surfaced in Onboarding and the Models page).** Top-tier quality, large files, user-opt-in.

### 2.2 Tier 1 content (bundled in DMG, ≤400 MB)

| Model                                                                                      | Size                                       | Role                                                                                               | Source                                                              |
|--------------------------------------------------------------------------------------------|--------------------------------------------|----------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| `ggml-small-q8_0.bin` *(multilingual, finetunable)* OR `ggerganov/whisper-small-ggml-q5_0` | ~250 MB                                    | Baseline STT — Russian-capable, usable on M1/M2, finishes a 10-minute recording in reasonable time | huggingface.co/ggerganov/whisper.cpp                                |
| `ggml-silero-v6.2.0.bin`                                                                   | ~4 MB                                      | VAD                                                                                                | huggingface.co/ggml-org/whisper-vad                                 |
| `silero_vad.onnx` (python-sidecar)                                                         | ~2 MB                                      | VAD for diarization pre-segment                                                                    | snakers4/silero-vad                                                 |
| Natasha pipeline artefacts                                                                 | ~0 MB file (pip package loads into memory) | Russian NER                                                                                        | natasha pip package (bundled via `python-sidecar/requirements.txt`) |

Total file payload added to DMG: **≈260 MB**. Final DMG size: current empty ≈80 MB electron + 260 MB models + helper
binaries ≈ **350-400 MB**.

*If `whisper-small` quality on Russian is unacceptable in hands-on test on Mac, fall back to `ggml-base` (~150 MB) with
explicit banner "download a better model for good Russian". Decided on Mac by shuka during validation pass.*

### 2.3 Tier 2 content (downloadable)

Surface through `Settings → Models → Download` and the Onboarding "Models" step (already exists).

| Model                                                   | Size    | When to suggest                                                      | Source                   |
|---------------------------------------------------------|---------|----------------------------------------------------------------------|--------------------------|
| `antony66/whisper-large-v3-russian` (ggml q5_0)         | ~1.5 GB | Default recommendation for RU quality                                | huggingface.co/antony66  |
| `ggml-large-v3-turbo-q8_0.bin`                          | ~0.9 GB | Multilingual top quality, faster than large-v3                       | huggingface.co/ggerganov |
| `ggml-large-v3-q8_0.bin`                                | ~1.5 GB | Highest multilingual quality                                         | huggingface.co/ggerganov |
| `bond005/whisper-large-v3-ru-podlodka` (ggml q5_0)      | ~1.5 GB | RU fine-tune, podcast-style speech                                   | huggingface.co/bond005   |
| `audeering/wav2vec2-large-robust-24-ft-age-gender`      | ~380 MB | Gender classification                                                | huggingface.co/audeering |
| `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim` | ~380 MB | Emotion classification                                               | huggingface.co/audeering |
| `GigaAM-v3` NeMo Conformer                              | varies  | Experimental SOTA RU STT — via separate inference stack, later phase | huggingface.co/ai-sage   |

`LLM` is still fully external (LM Studio / Ollama). ADR-010 does not change that.

### 2.4 Distribution mechanism: GitHub Releases as CDN

**Bundled Tier 1 models are NOT committed to the Git repo.** The repo stays small and cloneable.

- Create a versioned release asset on GitHub Releases: `mozgoslav-model-bundle-v1`. Assets include each file from Tier 1
  by exact filename.
- Publish Tier 1 assets once. They are versioned — if we ever update `whisper-small` in the bundle, we bump to `v2` and
  the `dist:mac` script pins to the new tag.
- In `frontend/package.json` `dist:mac` script: before `electron-builder --mac`, run `scripts/fetch-bundle-models.sh`
  which downloads every Tier 1 asset from the pinned GitHub Release into `frontend/build/bundle-models/`.
  `electron-builder.yml` adds `extraResources` for that folder.
- At runtime, the backend discovers bundle models via `IAppPaths.BundleModelsDir` (new — wired to Electron
  `process.resourcesPath` for prod, repo-local path for dev).
- If bundle models were already downloaded (cache present), the fetch script is a no-op.
- CI does **not** download bundle models. Tests use fake models (see ADR-009 §2.1 and
  `plan/v0.8/02-ml-sidecar-production.md`).

Tier 2 downloads continue to flow through the existing `ModelDownloadService` + `ModelCatalog` using HuggingFace direct
URLs (already in code). No change.

### 2.5 `ModelCatalog` changes

```csharp
public sealed record CatalogEntry(
    string Id,
    string DisplayName,
    long ByteSize,
    ModelTier Tier,              // NEW: Bundle | Downloadable
    ModelKind Kind,              // STT | Vad | Diarize | ...
    string FileName,
    Uri DownloadUrl,             // HF URL for Downloadable; Release URL for Bundle
    IReadOnlyList<string> Aliases);

public enum ModelTier { Bundle, Downloadable }
```

`ModelTier.Bundle` entries resolve to `IAppPaths.BundleModelsDir/<FileName>`. `ModelTier.Downloadable` entries resolve
to `~/Library/Application Support/Mozgoslav/models/<FileName>` and are fetched on demand.

### 2.6 Onboarding alignment

Onboarding step "Models" today asks the user to download `ggml-large-v3-q8_0.bin`. After ADR-010:

- If bundle models are present: step auto-passes with a banner "Russian starter models ready. Upgrade to top quality
  below?" plus a one-click button "Download antony66 (1.5 GB, best Russian)". User can skip to next step.
- If bundle models are absent (dev environment without `fetch-bundle-models.sh` run): show a warning + "fetch now"
  button.

The Onboarding "LLM" step is unchanged — user still runs LM Studio externally.

---

## 3. Alternatives considered

### 3.1 Commit models to Git (~260 MB of binaries)

- Simplest: `git add models/bundle/`, everyone who clones gets them.
- **Rejected.** Repo grows to ~300 MB. Every clone pays the cost. Every CI run pays the cost (actions/cache helps, but
  not zero). Git LFS is an option but adds per-seat storage cost (~1 GB free tier) and breaks `gh api` and `git archive`
  in subtle ways. GitHub Releases is free for public repos and unlimited in size.

### 3.2 Git LFS

- Models live in repo under LFS.
- **Rejected.** Same git-flow complexity, burns LFS bandwidth quota, adds a new failure mode for new contributors. No
  upside over GitHub Releases for our use case.

### 3.3 Hugging Face Hub as hosted bundle

- Create `huggingface.co/AlexShchuka/mozgoslav-bundle`, download from there.
- **Rejected.** Introduces a second hosting identity to maintain, requires HF auth in the build pipeline, no advantage
  over GH Releases for a public repo.

### 3.4 No bundle, onboarding downloads everything

- Keep the current flow. Improve download UX.
- **Rejected.** The user explicitly asked for zero-download first run. Wait time for 1.5 GB on first run kills the
  onboarding.

### 3.5 Bundle only the 150 MB `ggml-base`

- Cheaper DMG. Quality lower.
- **Considered as fallback.** If Mac validation shows `whisper-small` is materially bad on Russian, fall back to
  `ggml-base` + louder "download a real model" banner. Default is `whisper-small`.

---

## 4. Consequences

- **DMG grows from ~80 MB to ~350-400 MB.** Acceptable for a desktop privacy-first app.
- **Release process adds a manual step once per bundle change** — create a new `mozgoslav-model-bundle-vN` release, pin
  `scripts/fetch-bundle-models.sh` to the new tag. We do this rarely (~once per year unless a new baseline model
  arrives).
- **`dist:mac` now requires network** on a fresh checkout — to fetch bundle models from Releases. Cache-friendly (script
  is a no-op if already present).
- **CI does not touch Releases.** Testcontainers + fakes keep CI fast.
- **Tier 2 quality path is unchanged.** `ModelDownloadService` + `ModelCatalog` entries for antony66, audeering, etc.
  already exist or are tiny additions.

---

## 5. Open items for user review

- (A) **Baseline bundle STT** — `whisper-small` or `whisper-base`? Vote: `whisper-small` (250 MB, better quality) with
  fallback to `whisper-base` (150 MB) if shuka finds small-quality unacceptable on his test audio. Confirm.
- (B) **Tier 1 bundle for ML (gender/emotion)** — audeering is ~380 MB each, too big for Tier 1. Ship only diarize + NER
  in Tier 1 as proposed; gender/emotion endpoints return 503 with "download model" until user opts in via Models page.
  OK?
- (C) **Bundle-release cadence** — who creates the GH Release? Proposed: shuka (repo owner), once. If we need v2 later,
  we discuss then.
- (D) **`extraResources` vs a post-install downloader** — proposed: `extraResources`, bakes models into the `.app`.
  Alternative: app detects missing bundle on first run and downloads. `extraResources` is cleaner (offline-capable
  immediately) but grows the DMG. Confirm `extraResources`.

# ADR-009 — Production-readiness: no stubs in shipped code

- **Status:** Proposed (pending user review).
- **Date:** 2026-04-17.
- **Supersedes:** none.
- **Related:** ADR-001 (vision), ADR-007 (onboarding/scope), `SELF-REVIEW.md` §3.
- **One-line summary:** everything that ships in v0.8 either works or announces honestly that it does not. No stubs that
  return fake data, no TODO-comments in prod paths, no "extension points" that silently no-op.

---

## 1. Context

### 1.1 Current state (prior to v0.8)

The `main` branch at `f561fc1` contains a working skeleton with nine half-finished features (per `SELF-REVIEW.md` and
grep across `backend/src`, `frontend/src`, `python-sidecar/app`, `helpers/`):

| # | Location                                                                   | Kind                                                                               |
|---|----------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 1 | `backend/src/Mozgoslav.Infrastructure/Services/NoopAudioRecorder.cs`       | Stub — throws `PlatformNotSupportedException` on `Start/Stop`                      |
| 2 | `python-sidecar/app/services/{diarize,gender,emotion,ner}_service.py`      | Stub — returns hardcoded payload with the correct shape                            |
| 3 | `frontend/electron/dictation/globalHotkey.ts` + helper                     | Half-done: `globalShortcut.register` wired, macOS-native round-trip never verified |
| 4 | `backend/.../CorrectionService.cs` (glossary, LLM-correction paths)        | Extension points — fields wired in settings, logic is no-op                        |
| 5 | `backend/.../` Obsidian REST API client                                    | Token + host in settings, no client exists                                         |
| 6 | `backend/.../SyncthingLifecycleService.cs` phone pairing                   | Code wired, never paired to a real phone in this repo                              |
| 7 | RAG embeddings: `BagOfWordsEmbeddingService` used when sidecar unreachable | Acceptable fallback (not stub) — but needs explicit UX signal                      |
| 8 | Dictation overlay / DictationSessionManager                                | Full wiring, but depends on items 1 and 3                                          |
| 9 | Various `TODO-X` comments in `Program.cs`, `*EndPoints.cs`, `*.tsx`        | Mixed: some are already-done markers, some are alive                               |

### 1.2 Why this matters now

User mandate for v0.8 («Доведение до ума»): no stubs in production, code is production-ready, single MR. The skeleton
was useful during the scaffold phase — every consumer (UI, tests, frontend developer) could develop against a known
contract. It stops being useful the moment we ship a DMG to a user who expects the app to work.

A stub that returns fake data silently is worse than a missing feature:

- The user thinks the feature works, trusts the output, and finds out later the diarization was made up.
- Tests that call the stub pass trivially and give false safety.
- The code path is not exercised under load, so the real implementation drops into untested territory when it arrives.

---

## 2. Decision

**Policy.** In v0.8 and afterwards, any code path that lands on `main` satisfies exactly one of the following:

1. **Implemented end-to-end.** Real logic. Exercised by an integration test (not only a unit test of the happy path).
2. **Honest platform/feature gate.** Interface declares `IsSupported = false` (or equivalent); UI hides or disables the
   feature on platforms where it is not supported; contract throws a typed exception with a clear message if called
   anyway. No silent no-op, no fake return value.
3. **Opt-in feature flag — disabled by default.** Behind an `IFeatureToggle` or `appsettings` switch that ships `false`.
   The flag is a named, documented on/off, not a mood.

Anything that is **not** one of 1–3 is a stub and MUST NOT ship.

### 2.1 Consequences per current stubs

| Current                               | Treatment in v0.8                                                                                                                                                                                                                                                                                               |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `NoopAudioRecorder`                   | **Replace.** Native macOS `AVFoundationAudioRecorder` (via Swift helper + IPC). On Linux/Windows: keep a `PlatformUnsupportedAudioRecorder` that declares `IsSupported=false` and throws on `Start`. UI hides the Record button when unsupported. — treatment (2) for non-mac, (1) for mac.                     |
| `diarize_service.py`                  | **Replace.** Silero VAD + Resemblyzer embeddings + agglomerative clustering (per `PYTHON-SIDECAR-SPEC §5.1`). Models via Onboarding. Treatment (1).                                                                                                                                                             |
| `gender_service.py`                   | **Replace.** `audeering/wav2vec2-large-robust-24-ft-age-gender`. Treatment (1). Bundled minimum does **not** include this (it is 1 GB+); endpoint returns 503 with a clear message until the user downloads the model via Onboarding. This is treatment (2) in its disabled state and (1) in its enabled state. |
| `emotion_service.py`                  | **Replace.** `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim`. Same gating as gender.                                                                                                                                                                                                                    |
| `ner_service.py`                      | **Replace.** Natasha pipeline. Bundled minimum includes Natasha (lazy-load from the pip package, ~200 MB runtime). Treatment (1).                                                                                                                                                                               |
| Global dictation hotkey               | **Verify on Mac with shuka, then treat as (1).** If the round-trip cannot be made green on Mac in the v0.8 scope, move the `Settings → Dictation → Global hotkey` toggle behind a feature flag (treatment 3) with a banner in the UI.                                                                           |
| Glossary + LLM-correction             | **Replace with real logic.** Per-profile glossary list → token replacement before LLM call; LLM-correction = a dedicated correction prompt run post-transcription. Treatment (1).                                                                                                                               |
| Obsidian REST API client              | **Replace.** `ObsidianRestApiClient` using `token + host` from Settings; endpoint auto-detected via `/api` probe; falls back to file I/O if unreachable. Treatment (1) with graceful fallback.                                                                                                                  |
| Syncthing phone pairing               | **Verify on Mac with shuka.** If not verified in scope: the full Syncthing UI moves behind `Mozgoslav:FeatureFlags:Syncthing=false`. Treatment (3).                                                                                                                                                             |
| `BagOfWordsEmbeddingService` fallback | **Keep.** It is a fallback, not a stub. Add an explicit UX signal in RagChat: "Using local fallback embeddings — quality may be lower. Configure python-sidecar for sentence-transformer quality." — now the user is told.                                                                                      |
| Per-file `TODO-X` markers             | **Audit each.** If the item is done — delete the marker. If alive — convert to a GitHub issue and remove the inline marker. Code comments are not an issue tracker.                                                                                                                                             |

### 2.2 Non-decisions (explicitly out of scope)

- **New features** (web-RAG, calendar autostart, new LLM providers, batch folders, dark-mode polish). ADR-009 scopes
  only what already exists in code.
- **Apple Developer signing** for the DMG. Treated separately in `plan/v0.8/07-dmg-and-release.md`. Default: unsigned
  DMG with Gatekeeper right-click-open workflow; signed variant is a later phase when a Developer ID is available.
- **Removing LLM graceful degradation** (raw-text fallback when LLM is down). This is a fallback, not a stub, and is
  production-correct.

---

## 3. Alternatives considered

### 3.1 Keep stubs with a runtime feature flag that hides the UI

- Ship all stubs, gate each behind a flag defaulting to `false`. UI hides the feature until the flag is on.
- **Rejected.** Amounts to dark-launching. The stub still sits in `main`, any developer can accidentally flip the flag,
  tests continue to pass trivially. It also gives the team no pressure to finish the feature — the flag is a permanent "
  later".

### 3.2 Delete every half-done feature, ship only the minimum

- Ruthlessly remove `NoopAudioRecorder`, all ML routers, the dictation pipeline, Syncthing, RAG. Ship only import →
  transcribe → summarize → export.
- **Rejected.** The user has asked for these features and they have real skeletons in the repo. The contract surface (
  API, frontend) already exposes them; removing would be a larger diff than finishing them, and would downgrade the
  product.

### 3.3 This ADR — "ship real or ship gated, never ship fake"

- Every path on `main` is either done, honestly platform-gated, or behind a named feature flag that is off.
- **Accepted.** It gives a binary audit rule: open the file, is the contract honest? If yes, keep; if no, fix.

---

## 4. Review rule (how to enforce)

On every MR to `main`:

1. Grep the diff for `TODO`, `FIXME`, `Noop*`, `Stub*`, `raise NotImplementedError`,
   `throw new PlatformNotSupportedException` — each occurrence is challenged. If it is legitimate under Decision §2 (
   honest gate or documented feature flag), it passes. Otherwise, blocked.
2. For every new or changed public endpoint: either an integration test hits a real implementation end-to-end, or the
   endpoint is explicitly behind a feature flag with a dedicated test for the gated state (503/404 with a clear
   message).
3. UI that exposes a feature: if `IsSupported=false` or flag=off, the control is hidden or disabled with a user-readable
   explanation, never silently unresponsive.

These three checks are the Definition of Done for v0.8 and after.

---

## 5. Open items for user review

- (A) **Syncthing phone pairing** — confident we will verify on Mac in v0.8? If not, flag-off is the fallback — you
  confirm scope.
- (B) **Gender/emotion ML endpoints default** — OK to ship endpoints that return 503 "download the model via Onboarding"
  until the user opts in? Alternative: hide the UI entirely until download. Recommendation: keep endpoints, return 503
  with actionable message, UI shows a "Download gender/emotion models" card — treatment (2) → (1).
- (C) **Global dictation hotkey** — if hands-on verification on Mac fails in scope, are you OK with flag-off treatment
  in v0.8 and a dedicated v0.9 micro-iteration?

No other decisions are deferred. §2 is the locked policy once you accept.

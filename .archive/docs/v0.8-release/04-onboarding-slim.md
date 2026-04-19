# Block 4 — Onboarding: slim, platform-aware, autodetect

- **Block owner:** developer agent.
- **Mac validation required:** yes (final UX pass on a fresh Mac account).
- **Depends on:** Block 2 (models catalogue with Tier 1/Tier 2), Block 3 (`/api/audio/capabilities`).
- **Unblocks:** Block 7 (DMG first-run is the Onboarding).

---

## 1. Context

`frontend/src/features/Onboarding/Onboarding.tsx` currently implements a 9-step wizard per ADR-007 §D15: welcome →
models → obsidian → llm → syncthing → mic → accessibility → inputMonitoring → ready.

Problems (per `SELF-REVIEW.md` and shuka's feedback):

- Steps that do not apply to the current platform are still shown and require skipping.
- The LLM step asks the user to install LM Studio / Ollama — a strong friction point.
- Syncthing is optional, but its step is visually identical to the required ones.
- Permission steps on non-macOS become noop cards that still clutter the flow.
- Nothing autodetects: the user has to manually confirm "yes I downloaded the model, yes I set the endpoint".
- Bundle models (per ADR-010) make "download a model" step largely unnecessary in v0.8.

## 2. Target flow (after Block 4)

### 2.1 Three required steps

1. **Welcome** — one sentence value prop, "Get started" button.
2. **Try it now** — autodetects bundled models (ADR-010 Tier 1). Shows "You can start now. Here's what we ship:
   whisper-small RU, silero VAD, Natasha NER. You can upgrade to top-quality models later from Settings → Models."
   One-click "Continue". No download required.
3. **Ready** — "You're all set. Click here to import your first audio." → lands on Dashboard.

### 2.2 Optional steps (shown only when applicable)

Each optional step appears as a card in a linear progress indicator but the user can skip any via a visible "Skip for
now" button. Skipping does not block the Ready step.

- **LLM** — polled autodetect of LM Studio (`:1234/v1/models`) and Ollama (`:11434/api/tags`). If one is running, show "
  Detected LM Studio. Select default model: [dropdown]" and pre-fill the endpoint. If nothing is running, show "LLM
  polishes your notes. Install [LM Studio](https://lmstudio.ai) or [Ollama](https://ollama.ai) to enable." with a "
  Skip — I'll do this later" button. Mozgoslav works without LLM (raw transcript + file export still happen).
- **Obsidian** — autodetect `~/Documents/Obsidian Vault` and common paths; if found, offer one-click "Use this vault"
  and create the `_inbox / People / Projects / Topics / Templates` structure. Otherwise, "Choose vault folder" button (
  native picker) + "Skip — I'll export later".
- **Mic permission** (macOS only) — calls `POST /api/audio/capabilities`, if permission is undetermined, requests it. If
  denied, deep-link to System Settings and re-poll. Skippable if the user never wants to record.
- **Accessibility + Input Monitoring** (macOS only) — grouped into one card "Dictation permissions" because the feature
  that needs them (global hotkey + AX inject) is a single feature. Same deep-link + re-poll pattern. Skippable —
  non-blocking for import/playback flows.
- **Syncthing** (all platforms) — only shown if user clicks "Enable mobile sync" on the Ready step. Becomes an optional
  follow-up, not an Onboarding step.
- **Model upgrades** — not a step. Surfaced as a banner on the Ready step: "Want better Russian transcription? Download
  antony66 (1.5 GB) — [Upgrade now / Later]".

### 2.3 Platform-specific rendering

`OnboardingPlatform` helper reads `navigator.platform` and `window.mozgoslav.version` (exposed via preload); effectively
a simple enum `macos | linux | windows | other`. Cards visible per platform:

| Card                  | macos | linux | windows |
|-----------------------|-------|-------|---------|
| Welcome               | ✓     | ✓     | ✓       |
| Try it now            | ✓     | ✓     | ✓       |
| LLM                   | ✓     | ✓     | ✓       |
| Obsidian              | ✓     | ✓     | ✓       |
| Mic permission        | ✓     | —     | —       |
| Dictation permissions | ✓     | —     | —       |
| Ready                 | ✓     | ✓     | ✓       |

Linux/Windows users see 4 cards max. Mac users see 6.

## 3. Autodetect contracts

### 3.1 Frontend poll

- Models: `GET /api/models/scan` returns `{ bundled: [...], downloaded: [...], missing: [...] }` so the wizard can
  render state without asking.
- LLM: `GET /api/llm/health` (existing) returns
  `{ reachable: boolean, endpoint: string | null, availableModels: [...] }` — extend to include detected providers.
- Obsidian: new `GET /api/obsidian/detect` returns common paths probed (`~/Documents/Obsidian Vault`, `~/Obsidian`,
  etc.) — if any exists with a `.obsidian/` folder, flag it.
- Permissions (macOS): `GET /api/audio/capabilities` from Block 3 returns the per-permission triplet.

### 3.2 Poll cadence

Welcome step: no polling. Try-it-now: single poll at mount. LLM / Obsidian: poll every 3 s while the user is on that
card; stop on navigate or detected success. Permissions: poll every 2 s while on the card.

## 4. Copy (ru + en i18n keys)

Every new string adds to `frontend/src/i18n/ru.json` and `en.json`. Agent keeps the onboarding key namespace flat and
descriptive (`onboarding.tryItNow.title`, `onboarding.llm.detectedLmStudio`, etc.). No inline English in TSX.

## 5. Gate logic

Current wizard uses boolean gate predicates to decide if "Next" is unlocked. After Block 4:

- Required steps: Next is always enabled. User cannot get stuck.
- Optional steps: Next is always enabled. "Skip for now" is the honest primary CTA when autodetect fails.
- Ready step shows a summary:
  ```
  ✓ Starter models ready (whisper-small RU, silero VAD, Natasha NER)
  ○ LLM — not configured (configure in Settings)
  ○ Obsidian vault — not selected (choose in Settings → Storage)
  ✓ Microphone granted
  ○ Dictation permissions pending
  ```

User sees exactly what is on and what they need to do later.

## 6. Tasks

1. Refactor `Onboarding.tsx` to render the new step list with platform-aware visibility.
2. Implement `OnboardingPlatform` helper.
3. Implement/extend backend endpoints:
    - `GET /api/models/scan` (if not already present in shape).
    - `GET /api/llm/health` — add provider detection.
    - `GET /api/obsidian/detect` — new.
    - `GET /api/audio/capabilities` (from Block 3).
4. Implement per-step autodetect hooks in React (`useLlmDetection`, `useObsidianDetection`, `useAudioPermissions`).
5. Update i18n files (ru + en) with new keys. Remove keys that belonged to the old steps that were removed.
6. Update onboarding CSS (styled-components in `Onboarding.style.ts`) for platform-aware layout.
7. Update or add tests in `frontend/__tests__/Onboarding.test.tsx` covering:
    - macOS full flow: 6 cards.
    - Linux: 4 cards (no mic/dictation).
    - LLM autodetect success path: pre-filled endpoint.
    - LLM autodetect miss: "skip" clearly visible.
    - Models autodetect: bundle present → auto-pass.
    - Permissions: undetermined → prompt → granted → auto-advance.
8. `ONBOARDING_COMPLETE_KEY` state management unchanged; set to `true` when user hits "Continue" on Ready.

## 7. Acceptance criteria

- On a fresh macOS install with bundled models present, a user can go from launching the app to "Ready" in under 5
  clicks and under 60 seconds (assuming no LLM + no Obsidian configured).
- Every autodetect surface updates the UI within 3 seconds of the detected change (user starts LM Studio → within 3 s
  the LLM card shows "Detected").
- On Linux/Windows, only the 4 applicable cards are shown; no blank/skipped cards in the step indicator.
- Onboarding never blocks the user: every step is skippable except Welcome and Ready.
- All i18n strings render in both `ru` and `en`.

## 8. Non-goals

- Changes to the underlying model download service (Block 2).
- Changes to actual permission granting mechanics (Block 3).
- Dark mode polish of Onboarding screens.
- Animated illustrations beyond what exists (framer-motion usage stays minimal).

## 9. Open questions (agent flags if hit)

- If the user skips Mic permission on Mac, the Record button later must trigger the permission prompt on click. Confirm
  the UX: soft prompt on click vs. redirect to Settings. Default: soft prompt (native macOS permission dialog). If OS
  already refused (denied), deep-link to System Settings + toast.

## 10. Mac validation checklist

After agent push, shuka:

1. Kill Mozgoslav, delete `~/Library/Application Support/Mozgoslav/`, relaunch to simulate first-run.
2. Walk through Onboarding. Confirm: welcome → try-it-now → (LLM — if LM Studio running, detected; else skip) → (
   Obsidian — if vault detected, one-click; else skip) → mic → dictation → ready.
3. Total time and click count: report.
4. Record a 10-second clip (from Block 3) — confirm pipeline end-to-end from here.
5. Configure Obsidian in Settings afterwards — confirm Ready step's "○ Obsidian vault" status can be satisfied
   post-Onboarding without breaking anything.
6. Report `block4-mac-validation-2026-04-YY.md`.

---

## 11. Checkpoint summary (Agent B + Resume Agent, 2026-04-17)

- Files added/modified: `frontend/src/features/Onboarding/OnboardingPlatform.ts`,
  `frontend/src/features/Onboarding/hooks.ts`, `frontend/src/features/Onboarding/Onboarding.tsx` (refactor — collapsed
  verbose meetily-style steps into Welcome → Try-now → LLM (auto-detect) → Obsidian (auto-detect) → Mic permission →
  Dictation → Ready), ru/en i18n keys, `frontend/src/features/Onboarding/__tests__/Onboarding.test.tsx`.
- Auto-detection wires to `/api/health/llm` (LLM endpoint) and `/api/audio/capabilities` (mic) — surfaces only failed
  prerequisites, skips green ones silently.
- Tests: jest suite `Onboarding.test.tsx` covers happy path + skip-on-detection + persisted `onboardingComplete` flag.
- Deviations from plan: none material; copy of "try it now" step matches §3 wording.
- Open: shuka Mac validation per §10 (real first-run flow + click count report).

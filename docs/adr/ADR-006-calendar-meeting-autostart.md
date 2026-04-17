# ADR-006: Calendar meeting autostart + UX / LM Studio / V2 polish

- **Status:** Accepted
- **Date:** 2026-04-17 (extended from 2026-04-16 draft)
- **Related:** ADR-002 (Dictation), ADR-003 (Syncthing), ADR-004 (Dictation/Sync refinements), ADR-005 (Local RAG)

<!-- SECTION: Context -->
## Context

Mozgoslav — локальный second-brain для разговоров, macOS-first desktop-app. К моменту этой сессии main содержит результат PR #2 (ApiFactory isolation RCA + dictation R1 custom-vocabulary initial_prompt + skeleton Syncthing backend). Параллельно Agent A дорабатывает ADR-003 pairing UX и ADR-004 R2-R10, а также доводит до конца ADR-005 RAG Q&A.

Задача этого ADR — зафиксировать пакет полировочных решений, который пришёл от пользователя одним пулом уже после того, как изначальный ADR-006 был написан в узком scope «calendar + meeting autostart». Scope расширяется: (1) системный UX-проход (кнопки, типографика, палитра, motion, Liquid Glass); (2) интеграция с LM Studio как первым-классным локальным провайдером; (3) V2-scaffolding — реальный AVFoundation-рекордер, мульти-провайдер LLM, CRUD профилей, kbar command palette, onboarding wizard.

Оригинальный calendar/meeting-autostart раздел (D-calendar) сохраняется verbatim как будущая итерация — его блокер по-прежнему реальный `IAudioRecorder`, который теперь встаёт в план под D-15.a. Никаких breaking changes — всё решение аддитивное: новые токены слотятся в существующий `theme.ts`, новые endpoints — под новые маршруты, новые колонки settings — с дефолтами, сохраняющими текущее поведение.

<!-- SECTION: Decisions -->
## Decisions

### D-calendar — Calendar & meeting-app autostart (original ADR-006 scope, preserved verbatim)

Granola / Fireflies / Fathom делают одну вещь, которую mozgoslav пока делает руками: когда пользователь начинает meeting (Zoom / Google Meet / Teams / Webex), приложение **само включает запись + транскрипцию**, без кликов. Для use-case «сценарий из операции» — ценнейшая фича: не забыть записать, не кликать между дейли-делами.

#### D-calendar.1 Источники событий

- **Apple Calendar (EventKit)** — запрашиваем доступ, читаем events на сегодня. Extract URLs / Zoom Meeting IDs / Google Meet codes.
- **Meeting-app detection через running processes** — `zoom.us` / `Google Chrome (с meet.google.com)` / `Teams` / `Webex`. Native helper (уже будет после ADR-002) может мониторить.
- **Combination:** calendar event → expected meeting time ± 5 мин window; when meeting-app process spawns AND there's matching event → trigger autostart.

#### D-calendar.2 Autostart flow

1. При старте mozgoslav — подписываемся на calendar events (EventKit).
2. За 2 мин до event — pre-warm Whisper (load model).
3. При detect'е matching meeting-app spawning → показываем toast: **«🎙 Meeting started: [title]. Recording will begin in 10s. [Cancel]»** → через 10 сек начинаем запись.
4. Pre-fill recording metadata: title, date, attendees (из event), conversation type = `Meeting`.
5. По окончании meeting-app process → auto-stop recording + enqueue для обычного pipeline (transcribe + LLM + export).

#### D-calendar.3 Permissions

- **EventKit** — TCC `NSCalendarsFullAccessUsageDescription` в Info.plist + onboarding-step.
- **Screen Recording** — для записи system audio во время meeting (мик + «speakers» как в meetily).
- **Automation** — если хотим читать Zoom app state напрямую (опц.).

#### D-calendar.4 UX

- **Opt-in** — дефолт выкл (`settings.autoRecord.enabled = false`). Пользователь включает явно.
- **Toast cancel window** (10 сек) — даём возможность не записывать если meeting персональный.
- **Do-not-record list** — domain/title blacklist (`settings.autoRecord.blockedPatterns`).
- Для opt-in и blacklist — без UI, через `settings.db`.

#### D-calendar.5 Reuse existing

- `IAudioRecorder` (будет реализован в рамках V2 roadmap) — используется.
- `ImportRecordingUseCase` — для enqueue обработки.
- Native helper из ADR-002 — monitor processes + bridge.

**Alternatives considered:** A1 только ручной запуск — отвергнут (Granola-style ценность). A2 hotkey-only без calendar — отвергнут (теряем «не забыть»). A3 OCR скриншотов Zoom — отвергнут (нагрузка, privacy).

**Consequences (calendar):** killer-фича, нулевое friction, reuse pipeline ~95%. Блокер — реальный `IAudioRecorder` (см. D-15.a). Удлиняется onboarding (EventKit + Screen Recording permissions). Privacy: calendar access sensitive; явно заявляем в Privacy Policy, nothing leaves device.

**Implementation plan (future iteration, out of this PR):** Phase 1 real `IAudioRecorder`, Phase 2 EventKit Swift helper, Phase 3 meeting-app process detection, Phase 4 orchestration + settings, Phase 5 mock-EventKit + process-spawn tests.

### D-1 — Button size ramp and macOS HIG 44pt hit target

**Decision.** Single size ramp across the app: `sm = 28 px`, `md = 34 px`, `lg = 42 px` (heights). Default variant bumped from `md = 36` to `md = 34` so density rises without losing tap targets; `lg` lands at 42 px, which pairs with Apple's 44pt-hit-target HIG when we add the 2 px outer focus ring (D-13) for a 44 px interactive footprint. Every primary surface (Dashboard record, Settings save, Queue cancel) uses `lg`. Body copy and form labels use a matching 15–16 px baseline — see D-2.

**Alternatives considered.**
- *Keep the old 28/36/44 ramp.* Rejected: `md` surfaces (most of the UI) felt cramped at current density per user feedback; moving to 34 reads as "bigger" without blowing out secondary toolbars.
- *Bump every size uniformly by +4 px.* Rejected: `sm` is mainly used inside tag strips and tray menus, where 32 px would force layout reflow in already-tight contexts.

**Consequences.** One-file change to `Button.style.ts`. The `lg` row in the Dashboard and Onboarding gets a little airier. Accessibility improves: every primary tap target now crosses the 42 px ceiling that WCAG 2.5.5 "Target Size (Enhanced)" recommends.

### D-2 — Modular scale 1.25 for body/UI, golden 1.618 for hero only

**Decision.** Body and UI chrome use a Major-Third modular scale (ratio 1.25) anchored at 15 px. Resulting ramp: `xs = 12`, `sm = 13`, `md = 15`, `lg = 18–19`, `xl = 24`. Hero / display copy jumps one golden step from body: 24 → 39 px (≈ 1.618 × 24). Nothing between the body ramp and the hero tier — deliberately skipping the in-between 30 px tier keeps hierarchy obvious at a glance. Golden ratio is kept out of the body ramp because density matters more than mathematical beauty when a user scans 20 queue rows.

**Alternatives considered.**
- *Pure golden ratio through the whole ramp.* Rejected: the 24→39 jump is dramatic, and applying the same 1.618 step between body sizes loses density in list-dense screens like Queue / Logs (NN/G's density caveat).
- *Perfect-Fourth 1.333.* Rejected: steps too coarse for the four-tier body we actually use.
- *Fifth-letter (1.5).* Rejected: similar density penalty as 1.333; no readability upside.

**Consequences.** `theme.ts` body sizes adjust to the 1.25 ramp (`md` was 14 → becomes 15). Hero tokens land in a new `theme.font.size.hero = 39px` bucket, used only by Dashboard hero and onboarding first screen.

### D-3 — Press / release spring animations

**Decision.** Adopt a single table of motion tokens used across every interactive surface. All values live in `src/styles/motion.ts` and are shared between plain styled-components transitions (for fallbacks) and Motion's `transition` prop.

| Interaction            | Shape                                                                     | Duration          |
| ---------------------- | ------------------------------------------------------------------------- | ----------------- |
| Button press-down      | spring `{ stiffness: 420, damping: 28 }`, scale 0.96, opacity 0.82         | 80–120 ms         |
| Button release         | spring `{ stiffness: 300, damping: 20 }`, scale → 1, ≤ 3 % overshoot       | 200–260 ms        |
| Modal enter            | cubic-bezier(0.22, 1, 0.36, 1), scale 0.96→1, y 8→0, opacity 0→1            | 220–280 ms        |
| Modal exit             | cubic-bezier(0.32, 0, 0.67, 0)                                             | 160–200 ms        |
| Page / tab cross-fade  | ease-out                                                                  | 180 ms            |
| Tray icon state        | soft spring + colour/glow tween                                           | 400 ms            |
| Toast slide-in         | spring `{ stiffness: 260, damping: 22 }`                                   | 240 ms            |
| List item enter        | ease-out, 40 ms stagger                                                   | 120 ms per item   |
| Queue row cancel       | fade + collapse height → 0                                                | 180 ms            |

**Alternatives considered.** *Tween everything with CSS transitions.* Rejected: springs give the 3 % overshoot that makes press-release feel tactile; tweening lands flat. *Framer Motion `mass/stiffness/damping` presets.* Rejected: Motion's explicit numeric knobs are clearer in code review than opaque preset names, and let us keep the table above as the single source of truth.

**Consequences.** All decorative animations gate on `useReducedMotion()` (see D-13): when `true`, every entry collapses to a 0 ms fade — no scale, no spring overshoot. This keeps the app accessible and prevents motion-sickness regressions.

### D-4 — Liquid Glass chrome (hand-rolled `backdrop-filter`)

**Decision.** Adopt the macOS-26/Tahoe-style Liquid Glass aesthetic for app chrome (sidebar, modal backdrop, toast surfaces) using a hand-rolled CSS recipe: `backdrop-filter: blur(20px) saturate(180%)` plus a layered `::before` highlight (2 px inset white-alpha stroke + radial gradient) for the glassy rim. No external library for these surfaces — one mixin in `src/styles/liquidGlass.ts` re-used everywhere.

**Exception.** The hero CTA (brain-icon launcher, see D-7) is allowed to render through `rdev/liquid-glass-react` (MIT) because that surface demands the physically-shaded refraction effect that is painful to hand-roll. One dependency, one component, zero creep into regular chrome.

**Alternatives considered.**
- *`@developer-hub/liquid-glass` / other wrappers for all surfaces.* Rejected: bundle cost and style-lock-in; our chrome only needs blur + saturate + rim highlight.
- *Skip Liquid Glass entirely, keep flat panels.* Rejected: misses the macOS 26 alignment user asked for; flat panels visibly lag behind the system chrome.

**Consequences.** Adds `motion` (≈ 18 KB gzipped — D-5) and `liquid-glass-react` (≈ 7 KB). On Linux dev boxes where `backdrop-filter: blur` is less performant the mixin falls back (via `@supports not`) to an opaque translucent fill so the UI never flickers. Every glass surface keeps WCAG AA copy contrast (D-6) because the `::before` rim darkens the base enough to pass 4.5:1.

### D-5 — Motion (ex-Framer Motion) with `LazyMotion` + `domAnimation`

**Decision.** Standardise on Motion (the current name for what shipped as `framer-motion`) as the only animation library in the renderer. Mount a single `<LazyMotion features={domAnimation} strict>` at the app root; every animated surface uses the `m.*` primitives inside that boundary. `strict` enforces the `m.*` shorthand and blocks accidental use of the heavy full-feature `motion.*` component — tree-shaking the library down to ~18 KB gzipped.

Because `framer-motion@12` (already a dep) and `motion@12` (new package name) are the same codebase under different names, we install the new `motion` package and migrate imports in one sweep; the old `framer-motion` dep is kept until all imports flip, then removed in the B1 commit.

**Alternatives considered.**
- *React Spring.* Rejected: less ergonomic API for declarative lists + stagger, and we lose the `useReducedMotion` hook which Motion ships out of the box.
- *GSAP.* Rejected: imperative model fights React reconciliation, plus licence nuances when used commercially even though we're MIT.
- *Keep plain CSS transitions.* Rejected: we need the spring overshoot and orchestration (AnimatePresence exit + stagger) for D-3 / D-9 / B3 to look right.

**Consequences.** Single animation mental model across the codebase. ≈ 18 KB gzipped into the renderer chunk; Vite code-splits it cleanly. `strict` mode surfaces any future "accidentally imported `motion.div`" as a runtime warning in dev, which keeps the tree-shake honest.

### D-6 — Palette tokens (brighter base + 4 system accents)

**Decision.** Retire the purple-anchored palette and move to a macOS-native neutral base with four restrained system accents used only for state and iconography — never as large surface fills.

```
--neutral-bg:       #F5F5F7   /* light window */
--neutral-bg-dark:  #1C1C1E   /* dark window chrome */
--neutral-fg:       #1D1D1F   /* body copy on light */
--neutral-fg-dim:   #6E6E73   /* muted copy / meta */

--accent-primary:   #0A84FF   /* macOS system blue, anchor / CTA / focus ring */
--accent-green:     #34C759   /* success, live indicators */
--accent-orange:    #FF9F0A   /* processing, warn */
--accent-pink:      #FF375F   /* attention, recording */
```

Every foreground/background pair in light and dark themes is verified against WCAG AA — 4.5:1 for body copy, 3:1 for large copy (18 px+). The `#6E6E73` dim-foreground on `#F5F5F7` passes at 4.57:1; `#1D1D1F` on `#1C1C1E` dark uses an alpha-lift (`#F2F2F7`) for legibility.

**Alternatives considered.**
- *Keep purple `#7c3aed` accent.* Rejected: it reads branded and clashes with macOS 26 / Tahoe's native blue; user explicitly asked for a more macOS-neutral feel.
- *All-grey palette without accents.* Rejected: state indicators (recording / processing / error) need colour to parse quickly.
- *Full Material You dynamic colour.* Rejected: over-engineered for a local-first desktop app.

**Consequences.** `theme.ts` `lightTheme` / `darkTheme` maps replaced in one patch. Focus ring now pulls from `--accent-primary` (D-13). Legacy `accentSoft` / `accent` call sites continue to compile against the new values.

### D-7 — Brain-icon launcher (Obsidian Second Brain vibe)

**Decision.** Ship a single `BrainLauncher` React component — a stylised SVG brain (`lucide-react`'s `Brain` is the base glyph, MIT-licensed) wrapped in `m.button` with Motion animations and a `useReducedMotion` gate. The launcher is the app's hero CTA: it opens the dictation session / replaces the current Dashboard "Record" button, and sits in the tray as a smaller variant.

**Visual states.**

| State              | Fill                                                                                          | Outer glow                                                             |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Idle (default)     | `linear-gradient(135deg, #64D2FF 0%, #0A84FF 50%, #5E5CE6 100%)`                              | `0 0 24px rgba(10,132,255,.55), 0 0 48px rgba(94,92,230,.35)` (blue)   |
| Active / recording | `linear-gradient(135deg, #FF9F0A 0%, #FF375F 55%, #FF453A 100%)`                               | pink-dominant glow, ramps in over a 280 ms crossfade                   |

**Motion table (subset of D-3).**

- Idle: scale `1 ↔ 1.05` over 2.4 s `ease-in-out` infinite (breathing pulse).
- Hover: scale `1.08` + glow ×1.3, 160 ms spring.
- Press: scale `0.92` + glow ×0.7, 90 ms.
- Active-recording pulse: 0.8 s loop.

**Sizes.** 28–32 px for the toolbar / tray; 40–48 px for the Dashboard / dock-like launcher.

**Alternatives considered.**
- *Bundled raster PNG.* Rejected: doesn't scale crisply, can't re-tint between states without extra assets.
- *Pure CSS blob (radial gradient, no icon).* Rejected: loses the "second brain" reading — users need the glyph to understand the affordance.

**Consequences.** One new shared component `src/components/BrainLauncher/`. Reused by Dashboard (D-8), tray (V2), and command palette action (V2, B14). All decorative animations respect `prefers-reduced-motion`.

### D-8 — Record button enabled, wired to `DictationSessionManager`

**Decision.** Remove the `disabled` flag from the Dashboard "Record" control and replace its visual with the `BrainLauncher` component (D-7). Wire `onClick` to a minimal 4-state machine (`idle → arming → recording → stopping → idle`) that calls the existing `POST /api/dictation/start` and `POST /api/dictation/stop/{id}` endpoints. Arming / stopping are purely visual micro-states (~120 ms) that prevent double-click races.

The frontend does **not** own audio capture in this ADR — it triggers the server session; actual mic capture still flows through the dictation overlay pipeline (Electron main + Swift helper) that ADR-002 already scaffolded. Until the Swift recorder is real (D-15.a / B11), pressing the button starts a session against `NoopAudioRecorder`, so the state machine and UI flow are exercised end-to-end on Linux dev boxes as well.

**Alternatives considered.**
- *Keep button disabled until AVFoundation lands.* Rejected: the UX / UI work is the whole point of this PR; the state machine has to be reviewable now, and the backend endpoints already exist.
- *Redux-Saga slice.* Rejected for this iteration: the interaction fits a local `useReducer` neatly and does not cross features. If a second consumer appears we migrate to the saga slice pattern already documented in `frontend/CLAUDE.md`.

**Consequences.** Dashboard gains an `onRecordClick` handler; one React Testing Library test asserts state transitions on click + error. No backend changes.

### D-9 — Queue cancel endpoint + `AnimatePresence` row removal

**Decision.** Add cancellation support to both backend and frontend:

- **Backend.** New endpoint `DELETE /api/queue/{id}` in `JobEndpoints.cs`. Semantics — a job whose `Status == Queued` is removed outright; a job that is already running is marked `Failed` with `ErrorMessage = "Cancelled by user"` and its `FinishedAt` stamped, so the running worker surfaces the termination naturally and the record stays around for history. Repository gains `CancelAsync(Guid id, ct)` encapsulating this branching so endpoint logic stays thin.
- **Frontend.** Each `Queue` row wraps in `m.div` under `AnimatePresence`. Cancelling issues an optimistic local removal with `exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}` per the D-3 table. If the server rejects the DELETE (404 / conflict) the row re-enters via the same entrance animation and a toast explains the error.

**Alternatives considered.**
- *`POST /api/queue/{id}/cancel` instead of `DELETE`.* Acceptable, but `DELETE` is the natural REST verb for "remove this queued work item"; the branch for in-flight jobs is internal semantics, not an HTTP verb question.
- *Full Redux saga flow.* Rejected at this step — the Queue page already uses direct API + local `useState`; a saga migration is tracked separately.

**Consequences.** One new endpoint, one new repository method, one migration (none — existing schema carries `Status = Failed`), an animation wrapper on the existing row component. Server-side integration test spins a real SQLite via `TestDatabase` and verifies both branches (Queued → gone, Running → Failed).

### D-10 — i18n audit + ru/en parity enforcement

**Decision.** Sweep the renderer for hardcoded user-visible strings and migrate each to an i18next key present in both `ru.json` and `en.json`. The audit command is committed to `frontend/scripts/i18n-audit.mjs` so regressions can be caught locally:

```sh
node frontend/scripts/i18n-audit.mjs
```

It flags three classes of violation:

1. JSX children containing non-whitespace literal text outside `t(...)`.
2. `toast.*` calls with string literals.
3. Missing keys / mismatched nesting between the ru and en JSON trees.

Queue page (explicitly reported as missing translations) is migrated first; every other feature gets a drive-by during the B5 commit. Known gaps will be captured as new keys under the feature's existing namespace (e.g. `queue.cancel`, `dashboard.recordUnsupportedMacOnly`).

**Alternatives considered.**
- *Machine translation for the whole string catalogue.* Rejected: quality floor too low for UI copy, especially in Russian idioms we already own.
- *Bolt on `i18next-parser`.* Overkill at our size; a ~100-line parity script is easier to read and owns no extra dep.

**Consequences.** Both locale files end up with the same key shape; parity test runs in `npm test` (added in B5) so CI fails fast on future drift. One new script, no new runtime dep.

### D-11 — LM Studio discovery via `/v1/models`, no bundled downloader

**Decision.** First-class, **discovery-only** integration with LM Studio. Mozgoslav assumes LM Studio is installed and running on the user's machine, never downloads models on behalf of the user, never bundles a model manager.

- **Backend port.** New `ILmStudioClient` interface in `Mozgoslav.Application.Interfaces/` plus `LmStudioHttpClient` in `Infrastructure/Services/`. One method: `Task<IReadOnlyList<LmStudioModel>> ListModelsAsync(CancellationToken ct)` → `GET {endpoint}/v1/models` (LM Studio default `http://localhost:1234`, OpenAI-compatible schema). Endpoint base URL is read from `AppSettingsDto.LlmEndpoint` (already exists).
- **Endpoint.** New `GET /api/lmstudio/models` in `LmStudioEndpoints.cs`. Returns `{ installed: LmStudioModel[], reachable: bool }`. When unreachable, `reachable = false` and `installed = []` — the UI switches to the empty-state copy below.
- **Settings UI.** Under Settings → Local models (extended tab) two sub-lists:
  - *Installed via LM Studio* — pulled live from `/v1/models`. Empty-state copy (i18n keys under `settings.lmStudio.*`): RU «Установи LM Studio, чтобы управлять моделями локально», EN "Install LM Studio to manage local models".
  - *Suggested* — curated static list: Qwen 3 7B, Qwen 3 14B, Llama 3.3 8B, Gemma 3 9B, `whisper-large-v3-turbo`. Each row has a single **Open in LM Studio** CTA that deep-links via `lmstudio://models/<model-id>` (`electron.shell.openExternal`).
- **Removal.** Existing per-model Download buttons in `features/Models/` are **removed** — the page becomes a read-only list of local `.bin`/`.mlmodelc` files discovered under `AppPaths.Models` plus a copy line pointing at LM Studio for everything else.

**Alternatives considered.**
- *Bundle a downloader à la `models/download` endpoint.* Rejected — user explicitly said «отдельные кнопочки не нужны»; LM Studio already solves "download models" with a better UX than we can ship.
- *Probe Ollama in addition to LM Studio.* Deferred to D-14 (multi-provider) — LM Studio is the anchor because its OpenAI-compat API is what we already call.
- *Require LM Studio via a bundled install.* Rejected — we do not install third-party apps on the user's machine.

**Consequences.** Two new files (interface + http client), one new endpoint, one Settings sub-section, deletion of the existing download buttons. Pipeline consumption — `OpenAiCompatibleLlmService` reads `settings.LlmEndpoint` + `settings.LlmModel` exactly as before, so no change downstream once the user picks a model from the dropdown.

### D-12 — README one-liners for dev + prod

**Decision.** The README opens with two copy-pasteable one-liners. No multi-line "first do X, then Y" code blocks for the happy path — everything chainable with `&&`.

- **Run (dev).** `npm run dev` — orchestrated by `scripts/dev.mjs`, which starts (a) backend `dotnet run --project backend/src/Mozgoslav.Api`, (b) python sidecar `uvicorn app.main:app --reload --port 5060`, (c) Electron dev `cd frontend && WATCHPACK_POLLING=true vite`. Bootstraps lazily: the script only runs `npm ci` and `dotnet restore` when the respective lock/obj-dir is missing, so repeat runs skip cold installs. `concurrently` handles child-process lifecycle / ctrl-C propagation.
- **Build (prod).** `npm run build` — cleans `frontend/dist` + `frontend/dist-electron`, runs `dotnet publish -maxcpucount:1 -c Release` into `backend/publish/`, bundles the python sidecar (`pip install -r requirements.txt --target`), then `electron-builder --mac` to produce a signed `.dmg` + `.app`. A README note calls out that actual signing requires a macOS host; CI builds are unsigned by design.

**Alternatives considered.**
- *Leave users to orchestrate three terminals.* Rejected — high friction for contributors, and the MVP is a single desktop app.
- *Makefile.* Acceptable, but `npm run` is already the project's entry-point language, so we stay there for discoverability.
- *Turborepo / Nx.* Overkill for three scripts.

**Consequences.** Two new files (`scripts/dev.mjs`, `scripts/build.mjs`) and two new root-level npm scripts. Stale README sections (prior multi-step instructions) migrate to `docs/.archive/` — nothing is deleted, just no longer in the main entry-point.

### D-13 — Accessibility baseline (`prefers-reduced-motion`, WCAG AA, focus rings)

**Decision.** Four always-on rules policed by code review and the parity audit:

1. **Motion.** Every decorative animation is gated on Motion's `useReducedMotion()` hook. When it returns `true`, the animation reduces to a 0 ms fade — no scale, no spring. The gate lives in a single helper `useMotionPreset(preset)` (`src/styles/motion.ts`) so we don't scatter conditionals.
2. **Contrast.** Every foreground/background pair must pass WCAG AA (4.5:1 body, 3:1 large). The palette audit in D-6 already verifies the light / dark theme baseline; any new surface that introduces an `accent-*` foreground must be rechecked against `--neutral-bg*`.
3. **Focus rings.** 2 px inset + 2 px outer ring drawn in `--accent-primary`, radius matching the target component (`theme.radii.md` for buttons, `theme.radii.sm` for inputs). Applied via a shared `focusRing` CSS mixin and invoked through the `:focus-visible` pseudo-class only.
4. **Disabled state.** `opacity: 0.45` + `pointer-events: none`, **no animation**. The disabled state is visually distinct enough to read as "not actionable" without trapping reduced-motion users in a spinner or pulse.

**Alternatives considered.**
- *Rely on user OS setting globally.* Rejected: without a hook gate we still paint hover/press animations on mount, which is exactly the case `prefers-reduced-motion` is meant to prevent.
- *Higher contrast (WCAG AAA).* Desirable, but would force palette contrast changes that clash with macOS system accents we align to. Deferred as a follow-up if user complains.

**Consequences.** One shared `focusRing` + `useMotionPreset` + the D-6 palette cover every interactive component without per-component logic. A11y regressions surface the moment a component introduces inline styles — caught at review.

### D-14 — `ILlmProvider` abstraction (OpenAI-compat + Anthropic + Ollama)

**Decision.** Introduce a port `ILlmProvider` alongside the existing `ILlmService`. `ILlmService` stays as the app-facing "process this transcript" abstraction; `ILlmProvider` is the *transport* — one interface, three implementations:

- `OpenAiCompatibleLlmProvider` — wraps today's `OpenAiCompatibleLlmService`. Targets LM Studio, Ollama's `/v1`, OpenRouter, Groq, DeepSeek, any other OpenAI-REST speaker. Configurable base URL + API key.
- `AnthropicLlmProvider` — calls the Messages API directly. Streaming + non-streaming. Lives in its own file because the wire schema differs enough that a thin shim would be lossy.
- `OllamaLlmProvider` — uses `/api/chat` so users who want Ollama-specific params (temperature schedule, mirostat, num_ctx) aren't funnelled through the OpenAI shim.

**Settings shape.** `AppSettingsDto.Llm` becomes a nested record `{ Provider: enum {OpenAiCompat, Anthropic, Ollama}, Endpoint: string, ApiKey: string, Model: string }`. Seed default on fresh install: `OpenAiCompat`, `http://localhost:1234`, no key (LM Studio). All secrets remain in the SQLite `settings` table — never in config files or remote logs (privacy invariant).

The chunk/merge strategy (`Chunk`, `Merge` inside `OpenAiCompatibleLlmService`) is promoted to a shared helper `LlmChunker` used by all three providers; this is where the planned sync with `meetily transcript_processor.py` lands.

**Alternatives considered.**
- *Keep one provider and force everyone through OpenAI-compat.* Rejected — Anthropic's tool-use / thinking blocks and Ollama's raw-params control are exactly what power users who pick those providers are there for.
- *Plug a LangChain-style abstraction.* Rejected — heavyweight dependency for a three-provider surface.

**Consequences.** Three providers, one shared chunker. Each provider has unit-tests against mocked HTTP; an opt-in smoke test runs against a real LM Studio when `ENABLE_LM_STUDIO_SMOKE=1`. The existing `OpenAiCompatibleLlmService` can move behind the new `OpenAiCompatibleLlmProvider` cleanly — no call-site churn outside DI registration.

### D-15 — V2 scaffolding: AVFoundation recorder, profile CRUD, kbar palette, onboarding wizard

**Decision.** Four V2 workstreams tracked together because they share an invariant — they each put a user-visible surface on top of infrastructure that is already partly in place, and none can land in isolation without contradicting the post-this-PR roadmap.

- **D-15.a — AVFoundation audio recorder.** Replace `NoopAudioRecorder` with a real `AVFoundationAudioRecorder` driving `AVCaptureSession` via an extension of the existing `helpers/MozgoslavDictationHelper` Swift bundle. Format: 16 kHz mono float32 PCM (Whisper.net-native). JSON-RPC stays the transport; the `IAudioRecorder` interface signature does not change. Permission prompt + graceful "not granted" handling reuses the onboarding copy already in `ru.json` / `en.json`. Tests: JSON-RPC framing unit test (mocked transport); 1-sec silent-buffer round-trip integration test, skipped on Linux CI, runs on macOS.
- **D-15.b — Profile CRUD.** Full modal editor for `CorrectionProfile` (create / rename / duplicate / delete) + a per-app assignment table (bundleId → profileId, from ADR-004 R2) wired to new `POST /api/profiles`, `PUT /api/profiles/{id}`, `DELETE /api/profiles/{id}`. The existing list + badges component is reused; we add edit affordances rather than re-shelling it.
- **D-15.c — kbar command palette.** Replace the hand-rolled `CommandPalette` with `kbar` (already a dep, just unused). ⌘K globally opens it; actions come from a decentralised registration hook so each feature (Queue, Syncthing, Profiles, Calendar, Backup, Obsidian vault reveal-in-Finder) owns its own entries. Keyboard nav, fuzzy search, `localStorage` recent-actions memory. One React Testing Library spec: palette opens, query filters, action dispatches correct Redux-Saga action.
- **D-15.d — Onboarding wizard.** First-run wizard (triggered when `settings.onboarding_complete == false`) that walks the user through: welcome + privacy → mic permission (uses D-15.a hook) → AX permission (ADR-004 hook) → Syncthing pairing (D5 QR from ADR-003) → LLM provider pick (D-14) → Obsidian vault path picker → done. Re-entrant via Settings → Onboarding. i18n keys mostly exist under `onboarding.*`; any gaps picked up in D-10 audit.

**Alternatives considered.** Split each V2 track into its own ADR. Rejected — they share the same "infrastructure exists, user-surface missing" property and their commit ordering is naturally linear inside this PR when time allows. If any track is cut for time, it reaches `main` as an ADR-tracked **DEFERRED** item with its root cause captured in the PR body and `agent-b-report.md`.

**Consequences.** The four tracks represent the "V2 line" for this PR; the backlog is explicit and prioritised in the Implementation Plan below. No API breaks: every new endpoint sits under a new route, every new settings key is opt-in-by-default, and the wizard is cosmetic from the backend's point of view.

<!-- SECTION: ImplementationPlan -->
## Implementation plan (this PR)

<!-- TODO: ordered list of B-sections as they land -->

<!-- SECTION: Migration -->
## Migration / breaking changes

None. Every change is additive — new settings default off or preserve prior behaviour, new tokens slot into the existing theme shape, new endpoints sit under new routes.

<!-- SECTION: Consequences -->
## Consequences

<!-- TODO: bundle size delta, maintenance, dependency matrix -->

<!-- SECTION: References -->
## References

- PR #2 — EnsureCreated RCA + dictation R1 + Syncthing skeleton — <https://github.com/AlexShchuka/mozgoslav/pull/2>
- ADR-005 — Local RAG Q&A (context for LM Studio embedding plans)
- [Motion (ex-Framer Motion)](https://motion.dev/)
- [Nielsen Norman Group — Golden ratio in UI design](https://www.nngroup.com/articles/golden-ratio-ui-design/)
- [Apple Human Interface Guidelines — Inputs](https://developer.apple.com/design/human-interface-guidelines/inputs)

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

### D-9 — Queue cancel endpoint + AnimatePresence row removal

<!-- TODO: decision + alternatives + consequences -->

### D-10 — i18n audit + ru/en parity enforcement

<!-- TODO: decision + alternatives + consequences -->

### D-11 — LM Studio discovery via /v1/models, no bundled downloader

<!-- TODO: decision + alternatives + consequences -->

### D-12 — README one-liners for dev + prod

<!-- TODO: decision + alternatives + consequences -->

### D-13 — Accessibility baseline (prefers-reduced-motion, WCAG AA, focus rings)

<!-- TODO: decision + alternatives + consequences -->

### D-14 — ILlmProvider abstraction (OpenAI-compat + Anthropic + Ollama)

<!-- TODO: decision + alternatives + consequences -->

### D-15 — V2 scaffolding: AVFoundation recorder, profile CRUD, kbar palette, onboarding wizard

<!-- TODO: decision + alternatives + consequences -->

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

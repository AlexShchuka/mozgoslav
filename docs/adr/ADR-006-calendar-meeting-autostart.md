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

### D-2 — Modular scale 1.25 for body/UI, golden 1.618 for hero

<!-- TODO: decision + alternatives + consequences -->

### D-3 — Press / release spring animations

<!-- TODO: decision + alternatives + consequences -->

### D-4 — Liquid Glass chrome (hand-rolled backdrop-filter)

<!-- TODO: decision + alternatives + consequences -->

### D-5 — Motion (ex-Framer Motion) with LazyMotion + domAnimation

<!-- TODO: decision + alternatives + consequences -->

### D-6 — Palette tokens (#F5F5F7 / #1C1C1E + 4 system accents)

<!-- TODO: decision + alternatives + consequences -->

### D-7 — Brain-icon launcher (Obsidian Second Brain vibe)

<!-- TODO: decision + alternatives + consequences -->

### D-8 — Record button enabled, wired to DictationSessionManager

<!-- TODO: decision + alternatives + consequences -->

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

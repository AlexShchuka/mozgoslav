# ADR-006: Calendar & Meeting-app Autostart

- **Status:** Proposed — **future iteration, не для текущего launch MR**
- **Date:** 2026-04-16
- **Related:** ADR-002 (Dictation), ADR-003 (Syncthing)

## Context

Granola / Fireflies / Fathom делают одну вещь, которую mozgoslav пока делает руками: когда пользователь начинает meeting (Zoom / Google Meet / Teams / Webex), приложение **само включает запись + транскрипцию**, без кликов. Для use-case «сценарий из операции» — ценнейшая фича: не забыть записать, не кликать между дейли-делами.

## Decision (draft)

### D1. Источники событий

- **Apple Calendar (EventKit)** — запрашиваем доступ, читаем events на сегодня. Extract URLs / Zoom Meeting IDs / Google Meet codes.
- **Meeting-app detection через running processes** — `zoom.us` / `Google Chrome (с meet.google.com)` / `Teams` / `Webex`. Native helper (уже будет после ADR-002) может мониторить.
- **Combination:** calendar event → expected meeting time ± 5 мин window; when meeting-app process spawns AND there's matching event → trigger autostart.

### D2. Autostart flow

1. При старте mozgoslav — подписываемся на calendar events (EventKit).
2. За 2 мин до event — pre-warm Whisper (load model).
3. При detect'е matching meeting-app spawning → показываем toast:  
   **«🎙 Meeting started: [title]. Recording will begin in 10s. [Cancel]»** → через 10 сек начинаем запись.
4. Pre-fill recording metadata: title, date, attendees (из event), conversation type = `Meeting`.
5. По окончании meeting-app process → auto-stop recording + enqueue для обычного pipeline (transcribe + LLM + export).

### D3. Permissions

- **EventKit** — TCC `NSCalendarsFullAccessUsageDescription` в Info.plist + onboarding-step.
- **Screen Recording** — для записи system audio во время meeting (мик + «speakers» как в meetily).
- **Automation** — если хотим читать Zoom app state напрямую (опц.).

### D4. UX

- **Opt-in** — дефолт выкл (`settings.autoRecord.enabled = false`). Пользователь включает явно.
- **Toast cancel window** (10 сек) — даём возможность не записывать если meeting персональный.
- **Do-not-record list** — domain/title blacklist (`settings.autoRecord.blockedPatterns`).
- Для opt-in и blacklist — без UI, через `settings.db`.

### D5. Reuse existing

- `IAudioRecorder` (будет реализован в рамках V2 roadmap) — используется.
- `ImportRecordingUseCase` — для enqueue обработки.
- Native helper из ADR-002 — monitor processes + bridge.

## Consequences

### Положительные
- Killer-фича для «сценарий из операции».
- Нулевое friction: «зашёл на meeting → получил заметку».
- Reuse existing pipeline 95%.

### Отрицательные
- Требует **реального `IAudioRecorder`** (сейчас stub). Блокер — сначала замена Noop на AVFoundation.
- Permissions — EventKit + Screen Recording + возможно Automation. Onboarding удлиняется.
- False positives (пользователь открыл Zoom но не на meeting) — решается calendar-event matching + pre-meeting prompt.
- Privacy concerns: calendar access = sensitive. Никакого external sharing; явно заявляем в Privacy Policy.

### Out of scope
- Multi-participant speaker diarization (см ADR-005 / python-sidecar V3).
- Auto-join meeting (клик-за-пользователя) — NO, чистый observer.
- Live transcript в overlay для meeting — возможно добавить позже, reuse dictation streaming.

## Alternatives considered

**A1. Только ручной запуск.** Статус-кво. Отвергаем — User preference (Granola-style).

**A2. Hotkey-only (без calendar).** Без EventKit — проще, но теряем «не забыть».

**A3. OCR скриншотов Zoom (чтоб понять что начался).** Слишком нагружено, privacy-минусы.

## Implementation plan (future)

- Phase 1: real `IAudioRecorder` (prerequisite, отдельный ADR или TODO.md item).
- Phase 2: EventKit integration (Swift helper).
- Phase 3: Meeting-app process detection.
- Phase 4: Autostart orchestration + settings.
- Phase 5: Tests — mock EventKit + process spawn simulation.

## References
- [Apple EventKit docs](https://developer.apple.com/documentation/eventkit)
- Granola / Fireflies / Fathom — коммерческие референсы.
- [Screen Recording permission on macOS](https://developer.apple.com/documentation/screencapturekit)

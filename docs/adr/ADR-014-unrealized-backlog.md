# ADR-014 — Backlog: что ещё не реализовано

- **Status:** Living — обновляется по мере реализации / отмены пунктов.
- **Date:** 2026-04-17
- **Scope:** явный перечень фич/задач, которые мы сознательно не сделали. Current-state-доки в `README`/`CLAUDE.md`/`TODO.md` описывают только shipped — всё остальное живёт здесь.

## Политика

Если пункт в этом файле — он НЕ в коде. По мере реализации — пункт удаляется из ADR-014 и описывается в CURRENT-state doc'ах. Отменённые — перемещаются в `## Cancelled` в конце.

## Текущий backlog

### Release / distribution

- **Apple Developer ID signing + notarization.** Требует $99/год, приватный ключ у shuka. План миграции — в архивном `plan/v0.8/07-dmg-and-release.md` §8.
- **DMG auto-update (Sparkle / electron-updater).** Privacy-first политика текущая — «zero network checks». Если передумаем — отдельное ADR.
- **Linux/Windows билды.** Сейчас macOS-first. Не в планах.

### Transcription (STT)

- **GigaAM-v3 RU STT.** SOTA по русскому. Требует NeMo inference stack (не ggml). Phase 2.
- **Live streaming transcription.** Файловый pipeline сейчас, стрим — отдельный mode.
- **Speaker-aware transcript formatting.** Diarization уже пишет segments, но UI не показывает speaker labels — только plain text.

### ML (python-sidecar)

- **Real `process-all` endpoint.** В ADR-009 он в non-goals. Запускает цепочку diarize→gender→emotion→NER→cleanup→merge за один HTTP-запрос.
- **Multipart audio upload вариант endpoint'ов.** Сейчас passes `{audio_path}` (single-machine). Если sidecar уйдёт в container — нужно bytes.
- **Структурированный /metrics endpoint** (Prometheus-style) — если приложение обрастает telemetry story.

### Dictation

- **Global hotkey round-trip Mac verification.** Код написан, Swift helper расширен (`PermissionProbe.swift`), но живой прогон на Mac с AX permission + PCM capture + AX inject не подтверждён. Чек-лист — в `plan/v0.8/03-mac-native-recorder.md` §7.
- **Live audio level meters в Dashboard record state.** Сейчас только в DictationOverlay.
- **Hot-plug микрофонов** (USB mic inserted/removed mid-session).

### Sync (Syncthing)

- **Phone pairing end-to-end verification на Mac.** REST/SSE + QR-pairing UI всё написано, реальный phone не тестировали. Чек-лист — `plan/v0.8/.../sync`.
- **Conflict resolution UI.** Сейчас `listSyncConflicts` возвращает список, но UI-reconciler нет.

### RAG

- **Web-aware RAG.** Когда-то был груминг — `.archive/adrs/ADR-008-web-rag.md`. Приватность-критично. Если делать — отдельное ADR с privacy-boundaries.
- **Sentence-transformer улучшение качества.** Сейчас `BagOfWordsEmbeddingService` как fallback когда sidecar unreachable. Качество ниже.
- **RAG chat history persistence.** Разговор живёт в памяти.
- **"Re-index on note change"** hook — сейчас reindex по кнопке.

### Onboarding / UX

- **Reduced-motion fallback.** `prefers-reduced-motion: reduce` — пока не обрабатывается. Обязательно делаем одновременно с ADR-013.
- **Onboarding sample-audio "try it" button.** В ADR-004 (`plan/v0.8/04-onboarding-slim.md`) был как Should-have, в итоге не зашили.
- **CommandPalette custom-styling** — сейчас дефолтный kbar.
- **EmptyState illustrations** — сейчас текстовые.

### Profiles

- **Glossary autosuggestion из previous notes.** Nice-to-have, не критично.
- **Multilingual glossary** (RU+EN mixed) — сейчас single flat list.
- **Per-profile distinct LLM model** для correction vs summarisation — сейчас один активный provider.

### Meetings / Calendar

- **Calendar autostart.** Исторический ADR-006. Не востребовано.
- **Meeting bot integration** (Zoom/Google Meet hook).

### Maintenance / infra (из ADR-011 backend velosypedy)

- Quartz.NET замена `QueueBackgroundService`.
- `MemoryCache` замена `IdleResourceCache`.
- `Microsoft.Extensions.Http.Resilience` на HTTP-клиентах.
- EF Core Migrations вместо custom runner.
- `Microsoft.ML.Tokenizers` вместо символного chunker'а.
- `CliWrap` вместо `Process.Start` для ffmpeg.
- SSE через standard helpers.

### Frontend (из ADR-012 non-conformance)

- Убрать `MozgoslavApi.ts`, разложить по per-domain API classes.
- Container + Presentational для write-path features.
- Domain-based store slices (`profiles`, `models`, `settings`, `obsidian`, `sync`).
- `guards/` директория для gate-wrappers.
- `testUtils/` для общего render + mock API.
- Typed i18n keys.
- `models/` + `domain/` dedup.

### Dark/light polish

- **Light-mode visual review** — в ADR-013 light-theme заведена, но не проверена глазами на всех страницах.

## Cancelled

*(пусто)*

## Как обновлять этот файл

- Реализовали пункт → убрать отсюда, добавить в `TODO.md` секцию «Shipped» и в `README.md` / `CLAUDE.md` как current state.
- Отменили пункт → переместить в `## Cancelled` с коротким обоснованием «почему не делаем».
- Появилось новое отложенное — добавить в соответствующий раздел.

## Что НЕ попадает в этот файл

- Баги (они идут в GitHub Issues).
- Рефакторинг без изменения поведения (это ADR-011/012).
- Стилистические замечания (это ADR-013).

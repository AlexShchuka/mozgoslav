# ADR-014 — Backlog: low-priority deferred items

- **Status:** Living — обновляется по мере реализации / отмены пунктов.
- **Date:** 2026-04-18
- **Scope:** пункты, которые мы сознательно откладываем на неопределённый срок. Не в ближайшей очереди работы, но и не cancelled. Когда появится повод и bandwidth — поднимаем в `NEXT.md`.

## Соседние доки

- **Active queue** → [`NEXT.md`](NEXT.md) (critical + quick wins, то что делаем сейчас).
- **Post-v1.0 release-engineering** → [`POSTRELEASE.md`](POSTRELEASE.md) (DMG auto-update, Linux/Windows builds).
- **Новые архитектурные решения** → `ADR-016` (RAG chat history persistence), `ADR-017` (/metrics Prometheus).
- **Cancelled** → [`.archive/docs/backlog-cancelled-2026-04-18.md`](../../.archive/docs/backlog-cancelled-2026-04-18.md) (что решили не делать + почему).

## Политика

Если пункт в этом файле — он НЕ в коде. По мере реализации → пункт удаляется из ADR-014 и описывается в `README.md` / `CLAUDE.md` как current state.

## Transcription (STT)

- **T1 GigaAM-v3 RU STT.** SOTA по русскому. Требует NeMo inference stack (не ggml). Отложено — текущий Tier 2 `antony66/whisper-large-v3-russian` даёт WER 6.39% и покрывает большинство use-case'ов.
- **T2 Live streaming transcription.** Файловый pipeline сейчас — стрим отдельный mode. Большая архитектурная перестройка ради неочевидной ценности (юзер чаще импортирует / записывает разово, чем стримит).

## ML (python-sidecar)

- **M1 Real `process-all` endpoint.** В ADR-009 отмечен как non-goal. Цепочка diarize→gender→emotion→NER→cleanup→merge одним HTTP-запросом. Оптимизация round-trip'ов, не новая функциональность.

## Sync (Syncthing)

- **S1 Phone pairing end-to-end на Mac.** REST/SSE + QR-pairing UI написаны, живого прогона с реальным phone не было. Чек-лист — в архивном release-плане `.archive/docs/v0.8-release/`. Low-priority handheld валидация.
- **S2 Conflict resolution UI.** API `GET /api/sync/conflicts` возвращает список конфликтов Syncthing (одновременная правка одного файла на двух устройствах). UI, где пользователь выбирает «взять мой / взять их / merge / оставить обе» — нет. Сейчас конфликты копятся невидимо, Syncthing кладёт рядом `foo.sync-conflict-…md`. Риск тихой потери правок есть, но пока sync сам по себе low-priority → UI тоже low.

## RAG

- **G1 Web-aware RAG.** Privacy-критично, грумлено в архивном `.archive/adrs/ADR-008-web-rag.md`. Если решаем делать — отдельный новый ADR с privacy-boundaries.
- **G4 Re-index on note change.** Сейчас reindex по кнопке. Можно file-watcher / hook после export → `/api/rag/reindex`. Малый UX-бонус (юзер пока руками жмёт).

## Profiles

- **P1 Glossary autosuggestion из previous notes.** Mining терминов из прошлых нот + suggest UI. Nice-to-have.
- **P2 Multilingual glossary** (RU+EN mixed). Сейчас flat list; нужна структура `{ lang: [terms] }` + миграция.
- **P3 Per-profile distinct LLM model.** Сейчас один активный provider на backend. Override на уровне Profile — `Profile.LlmOverride? { provider, model }` + factory respects.

## Meetings

- **C2 Meeting bot integration** (Zoom/Google Meet webhook). Получение аудио с внешних платформ. Большая история, нужен отдельный ADR с privacy-implications.

## UX — low priority

### U3 — EmptyState illustrations (дизайнер внутри)

> Archived from NEXT on 2026-04-18 — design-asset dependency (no designer available).

Сейчас текстовые empty states в `NotesList`, `Queue`, `Models`, `Logs`. Заменить на SVG-иллюстрации per-context, живущие в `frontend/src/components/EmptyState/illustrations/`. Design tokens — из `theme.ts` (accent + soft bg + subtle stroke).

**Оценка:** M, дизайн + интеграция, пол-дня.

## Backend (ADR-011 deferred items)

- **B1 Quartz.NET AdoJobStore/SQLite swap.** ADR-011 §1 deviation. Сейчас durable business state живёт в таблице `processing_jobs` + `ProcessingJobRehydrator`; Quartz держит триггеры в RAMJobStore. AdoJobStore добавит второй источник state без дополнительной гарантии — swap имеет смысл только при появлении конкретного требования (multi-node scheduling, долго-живущие триггеры через рестарты без rehydrator).
- **B2 `HttpResilience` на `OpenAiCompatibleLlmProvider`.** ADR-011 §3 deviation. Провайдер использует OpenAI SDK и его собственный HTTP-pipeline — навесить `AddStandardResilienceHandler` без отказа от SDK невозможно. Отдельный MR: убрать SDK → raw `HttpClient` → прицепить named `"llm"` клиент с resilience. Большой рефакторинг LLM-слоя, не оправдан пока SDK работает.

## Как обновлять этот файл

- Поднимаем item в работу → **переносим в `NEXT.md`**, тут строку удаляем.
- Решили не делать совсем → строка переезжает в `.archive/docs/backlog-cancelled-YYYY-MM-DD.md` с обоснованием. Здесь удаляем.
- Появилось новое отложенное — добавить в соответствующую секцию.

## Что НЕ попадает в этот файл

- Баги → GitHub Issues (или `NEXT.md#Critical` если блокер релиза).
- Рефакторинг без изменения поведения → архивные ADR-011 / ADR-012 в `.archive/adrs/`.
- Post-v1.0 release-engineering → `POSTRELEASE.md`.
- Активные architectural decisions → новые ADR под своим номером (следующий свободный — 018).

# ADR-015 — Job cancellation (happy path, end-to-end)

- **Status:** Proposed
- **Date:** 2026-04-18
- **Scope:** backend `Mozgoslav.Domain` + `Mozgoslav.Application` + `Mozgoslav.Infrastructure` + `Mozgoslav.Api`; frontend `Queue.tsx` + locales.
- **One-line summary:** добавить cancel-ручку на processing job end-to-end. Happy path: `Queued → Cancelled` мгновенно, `Active → cooperative ct → Cancelled`, SSE-обновление, UI кнопка (уже есть на фронте, endpoint'а на бэке нет — отсюда 404).

---

## Context

`Queue.tsx:99` уже вызывает `api.cancelQueueJob(job.id)` и пишет `await api.cancelQueueJob(...)` → 404. Причина: endpoint'а `POST /api/jobs/{id}/cancel` на бэке не существует. `JobStatus` enum не содержит `Cancelled`. `ProcessQueueWorker` ловит `OperationCanceledException` и перебрасывает наружу без записи состояния (`QueueBackgroundService` просто выходит из цикла). `QueueBackgroundService` не хранит map `jobId → CTS`, поэтому снаружи нет способа сигнализировать конкретному активному job.

Это ломает доверие к прогрессу в целом: если «Cancel» не работает, пользователь логично заключает, что и progress bar врёт. Cancel — самая дешёвая точка восстановления доверия.

## Decision

1. Добавить `JobStatus.Cancelled` в `Mozgoslav.Domain.Enums.JobStatus` (последним, для безопасности int-ordering; EF converter хранит enum как string — int-порядок не нагружен).
2. Добавить `ProcessingJob.CancelRequested: bool` (default `false`). EnsureCreatedAsync подхватит новую колонку на свежей БД; на существующих dev-БД — добавить явную миграцию `0014_job_cancellation` в custom runner (`Infrastructure/Persistence/Migrations/`).
3. `IProcessingJobRepository.SetCancelRequestedAsync(Guid id, CancellationToken ct)` — атомарный update одной колонки + publish через `IJobProgressNotifier`.
4. `EfProcessingJobRepository.GetActiveAsync` — исключить `Cancelled` из выборки: `j.Status != Done && j.Status != Failed && j.Status != Cancelled`.
5. `QueueBackgroundService` — `ConcurrentDictionary<Guid, CancellationTokenSource>` для активных job'ов. Register перед `ProcessNextAsync`, unregister в `finally`. Linked token: `CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, perJobCts.Token)`.
6. `ProcessQueueWorker`:
   - Получает `perJobToken` вместо `stoppingToken` напрямую.
   - Новый `catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)` → `MarkCancelledAsync(job, ct: CancellationToken.None)` → publish `Cancelled`.
   - `OperationCanceledException` при остановке хоста — прокидываем наверх как раньше.
7. Endpoint `POST /api/jobs/{id}/cancel`:
   - `Queued` → сразу `Status = Cancelled` + `FinishedAt = UtcNow` + publish → `204 NoContent`.
   - Active (любой in-flight status) → `SetCancelRequestedAsync(id)` + `TryCancel(id)` в `QueueBackgroundService` → `202 Accepted`. Фактический переход в `Cancelled` делает worker через SSE.
   - `Done/Failed/Cancelled` → `409 Conflict` с `{ error: "job already in terminal state" }`.
   - `id` не найден → `404 NotFound` (остаётся естественный 404, но теперь только для реальных неизвестных id).
8. Frontend (`Queue.tsx` + locales):
   - `TERMINAL` → `["Done", "Failed", "Cancelled"]`.
   - `toneFor`: `Cancelled → "neutral"`.
   - `ru.json/en.json`: `queue.status.Cancelled = "Отменено" / "Cancelled"`.
   - UI кода в `handleCancel` больше не меняем — он уже корректен для happy path: на 200/202/204 локально удаляет job (SSE отправит финальный Cancelled и реконсилирует стейт).

## Scope (happy path only)

**Включено:**
- Все 8 пунктов Decision.
- Unit + integration тесты на все happy-path ветки (см. Agent runbook).
- Successful `dotnet build`, `dotnet test`, `npm run typecheck`, `npm test`.

**Не включено в ADR-015:**
- `Cancelling` transient state (переход `Queued/Active → Cancelling → Cancelled`). Happy path: сразу в `Cancelled`.
- Сохранение частичного transcript на cancel.
- `Process.Kill` для orphan ffmpeg-процесса.
- Cancel download модели, cancel dictation session — отдельные темы.
- Resume-after-cancel / retry-after-cancel.
- Bulk cancel.
- Heartbeat «stuck >30s» warning — это ADR-017 candidate.

## Non-goals

- Не гарантируем, что cancel активного job'а срабатывает мгновенно. SLA — «в пределах текущего этапа». ffmpeg-конверсия может занять до конца. Whisper уважает ct per-segment. HTTP-клиенты (LLM, Obsidian) уважают ct. Export — ct на IO. Для happy path приемлемо.
- Не делаем мониторинг «сколько раз cancel'или».
- Не делаем admin UI для cancel чужих job'ов (однопользовательское приложение).

## Consequences

- +: 404 устранён на существующем пути (`cancelQueueJob`).
- +: UI получает честный terminal state; доверие к pipeline возвращается.
- +: Cooperative cancellation становится нативной точкой для будущих resilience-политик.
- +: `GetActiveAsync` получает корректный список (ранее вернул бы `Cancelled` как «активный»).
- –: +1 enum value → одна миграция + небольшое расширение surface.
- –: Orphan ffmpeg процесс при cancel на стадии conversion — фиксируется в Non-goals.
- Cross-ref с ADR-011 §1: когда `QueueBackgroundService` уедет на Quartz.NET, per-job CTS map схлопнется в Quartz interrupt API. Миграция линейная, не блокирует.

## Open questions / follow-ups

- **unresolved:** нужна ли явная миграция `0014_job_cancellation`, или достаточно `EnsureCreatedAsync` + сброс локальной БД в dev? Решаем по месту при прогоне.
- Визуальный tone для `Cancelled` в ADR-013 — `neutral` сейчас хватит, детальное оформление (иконка, subtext «отменено пользователем в HH:MM») — не сейчас.
- Частичный transcript при cancel — Phase 2, если пользователь запросит.

---

## Agent runbook (один прогон developer-агента)

Последовательность: **все тесты → весь код → билд**. Последний шаг — успешный `dotnet test` и `npm test`. Агент не переключается между слоями: сначала **все тесты падающие (красные) на write-pass**, затем код, затем билд/тесты становятся зелёными.

### Pass 1 — tests first (красные)

Backend unit (`backend/tests/Mozgoslav.Tests/`):

- `Application/ProcessQueueWorkerTests.cs` — новые кейсы:
  - `ProcessNext_WhenCancelRequestedBeforeTranscribe_MarksCancelled` — устанавливаем `CancelRequested=true` до `DequeueNextAsync`; ожидание: job уходит в `Cancelled`, publish один раз.
  - `ProcessNext_WhenTokenCancelledDuringTranscribe_MarksCancelled` — mock `ITranscriptionService.TranscribeAsync` бросает `OperationCanceledException`; ожидание: job = `Cancelled`, не `Failed`.
  - `ProcessNext_WhenHostStopping_RethrowsCancellation` — stoppingToken отменён сам по себе; job остаётся в in-flight, OCE уходит наверх (существующее поведение — не регрессирует).
- `Domain/JobStatusTests.cs` (новый, если нет) — enum round-trip (EF value converter → string, back → enum) для `Cancelled`.

Backend integration (`backend/tests/Mozgoslav.Tests.Integration/`):

- `JobEndpointsTests.cs` (новый) или расширить существующий:
  - `Cancel_QueuedJob_Returns204_AndTransitionsToCancelled` — создаём job в `Queued`, дёргаем `POST /api/jobs/{id}/cancel` → 204, `GET /api/jobs/{id}` → `Cancelled`.
  - `Cancel_ActiveJob_Returns202_AndEventuallyCancels` — enqueue, мокаем долгий Whisper, cancel → 202; читаем SSE `/api/jobs/stream`, ждём `Cancelled` ≤ 2 s.
  - `Cancel_TerminalJob_Returns409` — создаём job в `Done`, cancel → 409.
  - `Cancel_UnknownId_Returns404` — cancel случайного Guid → 404.
- `SqliteProcessingJobRepositoryTests.cs` — кейс: `GetActiveAsync_ExcludesCancelled` (создаём по одному в каждом статусе, ожидание: Cancelled не в активных).

Frontend (`frontend/src/features/Queue/__tests__/`):

- `Queue.test.tsx` — новые кейсы:
  - `renders_cancelled_status_badge_with_neutral_tone` — SSE event с `status: "Cancelled"` → Badge tone `neutral`, Cancel-кнопка скрыта.
  - `does_not_show_cancel_button_for_cancelled_job` — `showCancel = !TERMINAL.includes(Cancelled) === false`.
  - `cancel_on_200_removes_job_locally` — уже существует в эквиваленте, расширить ассертом что нет `toast.error`.

Локаль-тесты не требуются (ключи автоматически проверяются на отсутствующие через typecheck или runtime warn — keep simple).

### Pass 2 — code (все правки разом)

Порядок внутри pass'а не важен; после этого pass'а все тесты Pass 1 должны зеленеть.

1. `backend/src/Mozgoslav.Domain/Enums/JobStatus.cs` — добавить `Cancelled` (последним).
2. `backend/src/Mozgoslav.Domain/Entities/ProcessingJob.cs` — `public bool CancelRequested { get; set; }`.
3. `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs` — убедиться, что `Cancelled` попадает в existing value converter (если converter enumerated explicit — добавить). Колонка `cancel_requested` маппится автоматически; иначе — `HasColumnName`.
4. `backend/src/Mozgoslav.Infrastructure/Persistence/Migrations/0014_job_cancellation.cs` — ALTER TABLE `processing_jobs` ADD `cancel_requested INTEGER NOT NULL DEFAULT 0`.
5. `backend/src/Mozgoslav.Application/Interfaces/IProcessingJobRepository.cs` — `Task SetCancelRequestedAsync(Guid id, CancellationToken ct)`.
6. `backend/src/Mozgoslav.Infrastructure/Repositories/EfProcessingJobRepository.cs` — реализация + правка `GetActiveAsync`.
7. `backend/src/Mozgoslav.Application/UseCases/ProcessQueueWorker.cs` — `MarkCancelledAsync`, `catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)`, проверка `CancelRequested` в начале `ProcessJobAsync` (мгновенный exit если уже запрошен).
8. `backend/src/Mozgoslav.Api/BackgroundServices/QueueBackgroundService.cs`:
   - `ConcurrentDictionary<Guid, CancellationTokenSource>` private static readonly.
   - Linked CTS per job в `ExecuteAsync` loop.
   - `public static bool TryCancel(Guid id)` — статик seam для endpoint'а.
9. `backend/src/Mozgoslav.Api/Endpoints/JobEndpoints.cs` — новая `MapPost("/api/jobs/{id:guid}/cancel", ...)`.
10. `frontend/src/features/Queue/Queue.tsx`:
    - `const TERMINAL = ["Done", "Failed", "Cancelled"] as const;`
    - `toneFor`: `if (status === "Cancelled") return "neutral";`
11. `frontend/src/locales/ru.json` + `en.json` — `queue.status.Cancelled`.
12. `frontend/src/domain/ProcessingJob.ts` (если union type) — добавить `"Cancelled"` к `status`.

### Pass 3 — build & verify (финальный, зелёный)

В порядке:

1. `cd backend && dotnet build -maxcpucount:1 Mozgoslav.sln` — compile clean, warnings-as-errors пройдены.
2. `cd backend && dotnet test -maxcpucount:1 Mozgoslav.sln` — все тесты Pass 1 + existing зелёные.
3. `cd frontend && npm run typecheck` — TS strict проходит (union расширен корректно).
4. `cd frontend && npm test -- --watchAll=false` — jest зелёный.
5. `cd frontend && npm run lint` — linter зелёный (если подключён в CI).

Acceptance gate: шаги 1-4 зелёные. Если 5 не в CI — пропустить.

### Агентские guardrails

- Писать ровно то, что в pass'ах. Scope-expansion (переименования, рефакторы, Quartz-миграция) — запрещено.
- Codestyle main: collection expressions (`[...]`), никаких `new[] { ... }` / `Array.Empty<T>()` в новом коде — см. свежий main-коммит `cdc670d codestyle`.
- Все `dotnet` команды — `-maxcpucount:1`.
- Никаких `--force`, никаких `main`-коммитов, никаких `--no-verify`.
- Ветка — новая от `origin/main`: `shuka/adr-015-job-cancellation`.
- Commit-формат — как в existing log (`feat(scope): ...`, `fix(scope): ...`).

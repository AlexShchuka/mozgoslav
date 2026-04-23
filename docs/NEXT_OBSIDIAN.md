---
title: Obsidian — deferred follow-ups after ADR-019
status: Planned
date: 2026-04-23
related: [ADR-019-obsidian-optional-sidecar]
authors: [shuka]
---

# Obsidian — что осталось после ADR-019

ADR-019 уехал тремя MR'ами: #48 (skeleton), #49 (backend drivers + endpoints + feature flag), #50 (frontend diagnostics + empty-state). Ниже — пункты, которые сознательно ушли в follow-up и их не надо терять.

## 1. Wizard-stepper (5-step first-run онбординг)

**Контекст.** ADR-019 §5.7 описывает стейт-машину из 5 шагов: (1) выбор/подтверждение vault path, (2) установка плагинов, (3) пользователь включает плагины в Obsidian (мы поллим), (4) чтение REST-токена из `plugins/obsidian-local-rest-api/data.json`, (5) установка bootstrap + Templater preset.

**Почему отложили.** Текущий Diagnostics-вид + кнопки «Reinstall plugins» + «Reapply templates» делают то же самое в один клик. Wizard добавит UX сопровождения, но это большой объём state-machine и резьба поверх кнопок, которые уже работают. Сначала — пощупать diagnostics в реальной жизни, потом решать что делать дальше.

**Что нужно (когда возьмём).**
- Endpoints `POST /api/obsidian/wizard/start` + `POST /api/obsidian/wizard/step/{n}`. Идемпотентные; реентрантные: состояние живёт в `VaultDiagnosticsReport`, не в отдельной wizard-таблице.
- Шаг 4: polling `data.json` до 30s, запись токена в `IAppSettings.ObsidianApiToken`.
- Frontend: `<ObsidianWizard />` stepper, саги `wizardSaga.ts`, UI-переключение между Wizard и Diagnostics по `diagnostics.vault.ok`.
- i18n: `obsidian.wizard.step.<n>.title|action`.

## 2. `ProcessedNoteSaved` publisher + `ObsidianDomainEventHandler`

**Контекст.** ADR-019 §5.5 — главная идея: sidecar не блокирует основной пайплайн. После сохранения `ProcessedNote` публикуется domain event; sidecar-consumer асинхронно экспортирует ноту через `IVaultDriver.WriteNoteAsync`.

**Почему отложили.** Требует аккуратной правки `ProcessQueueWorker` — единственная точка касания основного пайплайна, и CLAUDE.md §0 ADR-019 требует Draft MR + ревью до мёржа. Не хотелось смешивать это с инфраструктурной MR #49.

**Что нужно.**
- `IDomainEventBus` имплементация на `Channel<T>` fan-out (паттерн `IJobProgressNotifier` в `ChannelJobProgressNotifier`).
- Публикация `new ProcessedNoteSaved(noteId, profileId, DateTimeOffset.UtcNow)` в одной строке: там, где сейчас выставляется `ProcessedNote.ExportedToVault = true` или при первой записи `ProcessedNote` в БД.
- `ObsidianDomainEventHandler` — subscriber, кладёт в bounded `Channel<VaultNoteWrite>` (cap 128, `BoundedChannelFullMode.DropOldest`).
- `ObsidianExportBackgroundService : BackgroundService` — читает канал, вызывает `IVaultDriver.WriteNoteAsync`. Провалы → Serilog warn + `MozgoslavMetrics.ObsidianExportFailure.Inc()`. Не ретёрнит наверх, не останавливает основной пайплайн.
- Gate на `IAppSettings.ObsidianFeatureEnabled`: при `false` handler — no-op.
- Тест: `ProcessQueueWorker` завершает работу за секунду даже когда Obsidian недоступен (vault path пустой, никаких плагинов) — нулевой latency-impact.

## 3. Downscope `ObsidianRestApiClient`

**Контекст.** ADR-019 §5.4: `FileSystemVaultDriver` — единственный writer. REST-клиент должен держать только read-only методы: `IsReachableAsync`, `OpenNoteAsync`, `GetVaultInfoAsync`. `EnsureFolderAsync` должен уйти.

**Почему отложили.** `ObsidianRestApiClientTests` (WireMock) имеет тест `EnsureFolderAsync_PutsWithTrailingSlash`. Его удаление = collateral test edit. Держали MR'ы чистыми.

**Что нужно.**
- Удалить `Task EnsureFolderAsync(...)` из `IObsidianRestClient` + имплементации в `ObsidianRestApiClient`.
- Удалить тест `EnsureFolderAsync_PutsWithTrailingSlash` в `ObsidianRestApiClientTests`.
- Проверить grep по `EnsureFolderAsync` — не должно остаться call site'ов.

## 4. Flip test scaffolds (`Assert.Inconclusive` → real assertions)

**Контекст.** В #48 легли unit + integration скаффолды с `Assert.Inconclusive("pending impl — MR2 Commit …")` для каждой сценарной ячейки: `FileSystemVaultDriver`, `VaultDiagnosticsService`, `GitHubPluginInstaller`, `EmbeddedVaultBootstrap`, `VaultSidecarOrchestrator`, `ObsidianWizardEndpointTests`, `ObsidianDiagnosticsEndpointTests`, `FeatureDisabledTests`.

**Почему отложили.** Инфраструктура приземлилась в #49, но заменять Inconclusive'ы на реальные assertion'ы — отдельный objёмный виток (сотни строк тестов).

**Что нужно.** По каждому файлу:
- Unit-тесты `FileSystemVaultDriver`: реальные сценарии через temp dir (`ITestDirectory` helper), SHA-256 drift, backup под `<vault>/.mozgoslav/bootstrap-backups/<iso>/`, path-escape guard, UserOwned preserve, cancellation.
- `VaultDiagnosticsService`: каждое поле чипа через synthetic vault с разными состояниями `.obsidian/plugins/`, `community-plugins.json`, `data.json`.
- `GitHubPluginInstaller`: HTTP-moked через `HttpMessageHandler`-stub. SHA match / mismatch / 404 / timeout. Atomic swap cleanup на failure.
- `EmbeddedVaultBootstrap`: прочитать каждый embedded resource, сверить SHA с `manifest.json`, убедиться что `Manifest` — тот же инстанс на повторном чтении.
- `VaultSidecarOrchestrator`: happy path + failure branches через фейковые `IVaultDriver` / `IPluginInstaller`.
- `ObsidianWizardEndpointTests`: когда wizard появится (см. §1). До тех пор — оставить Inconclusive.
- `ObsidianDiagnosticsEndpointTests`: дёрнуть `GET /api/obsidian/diagnostics`, проверить shape. `FeatureDisabledTests`: 503 на всех write endpoint'ах при `ObsidianFeatureEnabled=false`, `GET diagnostics` всегда отвечает.

## 5. Telemetry — OTel counters

**Контекст.** ADR-019 §9 D7 просил: `MozgoslavMetrics.ObsidianExportAttempted`, `ObsidianExportFailure`, `ObsidianDiagnosticsCheck{check,ok}`, `ObsidianWizardStep{step,result}`.

**Почему отложили.** Диагностика работает без метрик; лучше добавить когда появится event-bus (§2) и wizard (§1), чтобы инструментировать то, что реально исполняется.

**Что нужно.** `MozgoslavMetrics` (`Mozgoslav.Infrastructure/Observability/MozgoslavMetrics.cs`) — добавить счётчики по паттерну существующих метрик. Зарегистрировать в OTel exporter'е. Эмитить из `ObsidianDomainEventHandler`, `VaultDiagnosticsService.RunAsync`, wizard endpoint'ах.

## 6. D4 smoke test — macOS

ADR-019 §9 D4.1–D4.4 — ручные smoke-шаги на реальной макбуке. Инструкции уже в ADR; надо пройти и записать результат:
- D4.1: Fresh empty folder → wizard (или через diagnostics + reinstall) → плагины установлены → REST token подхвачен → bootstrap в vault → «Sync All» → note в vault → открыть через REST.
- D4.2: `ObsidianFeatureEnabled=false` → вкладка Obsidian показывает «Feature disabled» → основной пайплайн обрабатывает запись без единого Obsidian-вызова (Serilog подтверждает).
- D4.3: удалить `_system/scripts/split_and_label.js` из vault → diagnostics флагит `Bootstrap.Outdated` → `Reapply bootstrap` восстанавливает → user-edits в `_system/corrections.md` сохранены.
- D4.4: ротация REST token внутри Obsidian → diagnostics флагит `RestApi.TokenMismatch` → handler `RefreshRestToken` возвращает зелёный статус.

## 7. Опционально — per-profile Templater templates

ADR-019 §N6: один `_system/templates/split-and-label.md` + один `Templates/Mozgoslav Conversation.md`. Когда появится potreb в разных профилях («рабочий» / «неформальный») — размножить шаблоны и положить под `_system/templates/<profile>/`, Templater подхватит автоматически.

## 8. Опционально — import from vault обратно в Mozgoslav

ADR-019 §N4: сейчас одна сторона — mozgoslav пишет в vault. Обратный poll (что руками поправили в vault → подтянуть в БД) — отдельная история, свой ADR.

# ADR-017 — Backend `/metrics` Prometheus endpoint

- **Status:** Proposed
- **Date:** 2026-04-18
- **Priority:** Low-mid (quick win, но пока приложение local-first — ценность ограничена).

## Контекст

`MozgoslavMetrics` (System.Diagnostics.Metrics) уже собирает метрики: `mozgoslav.jobs.processed_total`, `mozgoslav.transcription.duration_ms`, `mozgoslav.llm.requests_total`, `mozgoslav.http.retries_total` и т.д. OpenTelemetry SDK зарегистрирован в `Program.cs` (`.AddOpenTelemetry().WithMetrics(m => m.AddMeter(MozgoslavMetrics.MeterName))`), но экспортёра нет — метрики собираются в память и теряются.

Следствие:
- Нельзя диагностировать «почему у меня на Mac транскрибация стала медленнее после апдейта» без local-observability.
- CI/production (когда появится) не сможет скрейпить.
- `MozgoslavMetrics` — dead-end: никто его не читает.

## Решение (предлагается)

Добавить Prometheus scrape endpoint `GET /metrics` на том же Kestrel'е, что и API. Формат — стандартный Prometheus exposition (text-based).

### Реализация

Подключить `OpenTelemetry.Exporter.Prometheus.AspNetCore` nuget (официальный от OTel).

```csharp
// Program.cs
builder.Services.AddOpenTelemetry().WithMetrics(m => m
    .AddMeter(MozgoslavMetrics.MeterName)
    .AddAspNetCoreInstrumentation()
    .AddRuntimeInstrumentation()
    .AddPrometheusExporter());  // <-- новое

// после app.UseCors(...)
app.MapPrometheusScrapingEndpoint();  // GET /metrics
```

### Доступ

Kestrel binds на `localhost` (см. `CLAUDE.md` privacy). `/metrics` — тот же scope: доступен только с `127.0.0.1`. Никакого публичного exposure.

### Что будет в scrape'e

Автоматом из `MozgoslavMetrics` + OTel ASP.NET Core + runtime:
- Custom: `mozgoslav_jobs_processed_total{status}`, `mozgoslav_transcription_duration_ms`, `mozgoslav_llm_requests_total{provider,outcome}`, `mozgoslav_http_retries_total{client}`.
- ASP.NET Core: `http_server_request_duration_seconds`, `http_server_active_requests`.
- .NET runtime: `dotnet_gc_collection_count_total`, `dotnet_thread_pool_queue_length`, `dotnet_process_working_set_bytes`.

## Альтернативы (отвергнуты)

- **Serilog-text-logs only.** Уже есть. Дают narrative, не даёт time-series. Не ответят на «какой p95 у транскрибации за последний час».
- **Push-to-external (OTLP / InfluxDB).** Для local-first overkill — ни юзеру, ни devу не нужен внешний коллектор. При необходимости добавится как второй exporter.
- **Custom JSON endpoint.** Изобретение велосипеда — Prometheus text format стандартен, любой local Grafana / `prom2json` / cli-tool его парсит.

## Последствия

**Плюсы:**
- Dev может запустить local Grafana + Prometheus container (или просто `curl localhost:5050/metrics | grep mozgoslav`) и смотреть реальные цифры.
- `MozgoslavMetrics` перестаёт быть write-only. Имеющиеся счётчики начинают приносить пользу.
- В будущем — тот же endpoint работает в production (если/когда Mozgoslav пойдёт в cloud).
- Совместимо с v1.0 privacy-манифестом: наружу ничего не ходит, scrape — только localhost.

**Минусы:**
- Один новый nuget (`OpenTelemetry.Exporter.Prometheus.AspNetCore`). Размер ~150 KB.
- Эндпоинт виден на listening-порту — при смене сетевого режима (если когда-то расшарим наружу) нужно explicit-gate его auth-middleware'ом.

## Зависимости

- Нет. Делается в любой момент.

## Оценка

S, 1-2 часа:
- 15 мин — nuget install + `Program.cs` 2 строки.
- 30 мин — smoke-test: `curl http://localhost:5050/metrics`, убедиться что mozgoslav-метрики появляются после одной обработанной записи.
- 30 мин — integration test (обычный `ApiFactory` + `GET /metrics` → contains expected metric names).
- 15 мин — упоминание в `README.md` / `CLAUDE.md` как observability-опция.

# ADR-007 — Phase 1 Agent A (Foundation)

Read first: `ADR-007.md` (BCs, bugs, non-goals, coverage map), `ADR-007-shared.md` (conventions, API contract,
red-first, quality bar), `backend/CLAUDE.md`, root `CLAUDE.md`.

Agent A is **solo and sequential**. It owns every change that touches shared surfaces: `Program.cs`,
`MozgoslavDbContext`, migrations, `AppPaths`, settings baseline, Kestrel config, `LogsEndpoints` → `LogsController`
rewrite, primary-constructor sweep. Phase 2 starts only after Agent A's acceptance passes.

---

## 0. Goal and definition of done

**Goal.** Mozgoslav compiles clean (Release, `TreatWarningsAsErrors=true`), the solution passes the baseline integration
suite, shared surfaces are in a stable baseline that Phase 2 agents can extend without colliding, and the API contract
in `ADR-007-shared.md §2` is implementable as-is.

**DoD.** All of the following commands succeed from `/home/coder/workspace/mozgoslav-20260417/mozgoslav/`:

```bash
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
dotnet test  backend/Mozgoslav.sln -maxcpucount:1 --no-restore
npm --prefix frontend run typecheck
npm --prefix frontend run lint
```

Additionally:

- `dotnet run --project backend/src/Mozgoslav.Api --no-build` — startup log emits `SQLite schema ensured` exactly once,
  `Seeded 3 built-in profiles` exactly once, zero `Overriding address(es)` warnings, zero EF Core value-comparer
  warnings, zero `Syncthing REST: Connection refused` lines in the first 5 seconds.
- `curl http://127.0.0.1:5050/api/logs/tail?lines=10` returns a JSON `{file, lines, totalLines}` payload with real
  lines.
- `curl http://127.0.0.1:5050/api/profiles` returns the 3 built-in profiles.
-
`curl -X POST http://127.0.0.1:5050/api/models/download -d '{"catalogueId":"antony66-ggml"}' -H 'Content-Type: application/json'`
returns 202 Accepted with a `downloadId`.

---

## 1. Scope (ordered — do in this order)

### 1.1 Pre-flight (read-only)

```bash
cd /home/coder/workspace/mozgoslav-20260417/mozgoslav

# Verify baseline state
dotnet restore backend/Mozgoslav.sln -maxcpucount:1 || true
dotnet build   backend/Mozgoslav.sln -c Debug -maxcpucount:1 2>&1 | tee /tmp/initial-build.log

# Expect: 3 IDISP errors (IDISP006 + 2× IDISP003) in FfmpegAudioRecorder.cs.
# If the build succeeds, STOP — the branch drifted; escalate.
```

### 1.2 Step 1 — Build fix (N1) — `FfmpegAudioRecorder.cs`

**Refs.** BC-015 (stability gate), Bug N1.

**File.** `backend/src/Mozgoslav.Infrastructure/Services/FfmpegAudioRecorder.cs:22-102`.

**Symptoms.** 3 analyzer errors under `TreatWarningsAsErrors=true`:

- `IDISP006` — Implement IDisposable for a class holding disposables.
- `IDISP003` × 2 — Dispose previous before assigning.

**Fix pattern.**

```csharp
public sealed class FfmpegAudioRecorder : IAudioRecorder, IDisposable
{
    private readonly ILogger<FfmpegAudioRecorder> _logger;
    private Process? _process;
    private CancellationTokenSource? _cts;

    public FfmpegAudioRecorder(ILogger<FfmpegAudioRecorder> logger)
    {
        _logger = logger;
    }

    public async Task StartAsync(...)
    {
        _process?.Dispose();
        _process = new Process { ... };

        _cts?.Dispose();
        _cts = new CancellationTokenSource();
    }

    public void Dispose()
    {
        _process?.Kill(entireProcessTree: true);
        _process?.Dispose();
        _cts?.Dispose();
    }
}
```

**Verify.**

```bash
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
# Expect: 0 errors, 0 warnings.
```

---

### 1.3 Step 2 — DB path consolidation (bugs 10, 11)

**Refs.** BC-027 (profiles seed), Bug 10, Bug 11, Bug 15.

**Files.**

- `backend/src/Mozgoslav.Infrastructure/Platform/AppPaths.cs`
- `backend/src/Mozgoslav.Infrastructure/Seed/DatabaseInitializer.cs`
- `backend/src/Mozgoslav.Api/Program.cs`

**What to do.**

1. Single source of DB path: `AppPaths.Database` is canonical. Any `Mozgoslav__DatabasePath` env-var override logs a
   WARN at startup.
2. Add a startup log line:
   ```csharp
   _logger.LogInformation("Using database at {DbPath}", AppPaths.Database);
   ```
3. Scan the codebase for other references to `.db` paths:
   ```bash
   grep -rn "mozgoslav.db\|\.db\"\|DatabasePath" backend/src/ --include="*.cs"
   ```
4. Where a different path appears, route it through `AppPaths.Database`.

**Verify.**

- Fresh run: startup log has exactly one DB-path line.
- `GET /api/profiles` returns the 3 built-ins. If it returns `[]`, the path mismatch is still present — re-audit.

---

### 1.4 Step 3 — Kestrel + host de-dup (bug 8, bug 52)

**Refs.** BC-052, Bug 8.

**Files.**

- `backend/src/Mozgoslav.Api/appsettings.json:11` (has `Urls`)
- `backend/src/Mozgoslav.Api/Program.cs:48` (has `ConfigureKestrel`)

**Decision.** Drop `ConfigureKestrel` in `Program.cs`; keep `appsettings.json Urls` = `"http://127.0.0.1:5050"`. Single
source of truth. Rationale: `appsettings.json` is the operator-facing knob.

**Commands.**

```bash
# Remove WebHost.ConfigureKestrel block from Program.cs (lines ~48).
# Keep appsettings.json:
#   "Urls": "http://127.0.0.1:5050",
```

**Verify.** Startup log emits no `Overriding address(es)` WRN.

---

### 1.5 Step 4 — Startup log de-dup (bug 52)

**Refs.** BC-052, Bug 8.

**Files.**

- `backend/src/Mozgoslav.Infrastructure/Seed/DatabaseInitializer.cs`
- `backend/src/Mozgoslav.Infrastructure/Repositories/EfProfileRepository.cs`

**What to do.**

1. Register `DatabaseInitializer` as a singleton `IHostedService` that runs exactly once at `StartAsync`. Inside, use
   `IServiceScopeFactory.CreateAsyncScope()` to get a scoped `DbContext`. Do not keep the scope alive.
2. Audit places that materialise a scoped repository per call. `Seeded 3 built-in profiles` should log once, not three
   times.
3. Tests: add integration test
   `backend/tests/Mozgoslav.Tests.Integration/StartupLogTests.cs::SchemaEnsured_EmittedExactlyOnce`.

**Test fixture (red-first).**

```csharp
[TestClass]
public sealed class StartupLogTests
{
    [TestMethod]
    public async Task SchemaEnsured_EmittedExactlyOnce()
    {
        var captured = new List<string>();
        using var factory = new ApiFactory()
            .WithCapturedLogs(captured); // fixture to wire Serilog sink

        using var _ = factory.CreateClient();

        captured.Count(l => l.Contains("SQLite schema ensured"))
                .Should().Be(1);
        captured.Count(l => l.Contains("Seeded 3 built-in profiles"))
                .Should().Be(1);
    }
}
```

If `WithCapturedLogs` does not exist yet, extend `ApiFactory` with a captured-sink hook — document in the report.

---

### 1.6 Step 5 — EF value-comparers (bug 7)

**Refs.** BC-051, Bug 7.

**File.** `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs:32-145`.

**What to do.** Attach a `ValueComparer` to each of 8 list properties:

```csharp
private static readonly ValueComparer<List<string>> StringListComparer = new(
    (l, r) => l!.SequenceEqual(r!),
    v => v.Aggregate(0, (a, s) => HashCode.Combine(a, s.GetHashCode())),
    v => v.ToList());

modelBuilder.Entity<ProcessedNote>()
    .Property(n => n.KeyPoints)
    .HasConversion(/* existing converter */)
    .Metadata.SetValueComparer(StringListComparer);
```

Add migration `0007_value_comparers` (no schema change — annotation-only; but must be tracked in the
`__EFMigrationsHistory` table):

```bash
cd backend/src/Mozgoslav.Infrastructure
dotnet ef migrations add 0007_value_comparers --startup-project ../Mozgoslav.Api -- -maxcpucount:1
```

**Test (red-first).**
`backend/tests/Mozgoslav.Tests.Integration/DbContextValueComparerTests.cs::Mutate_KeyPointsZero_IsDetectedByChangeTracker` —
mutate an element, save, reload, assert change detected.

---

### 1.7 Step 6 — LogsController rewrite (D5, bug 9)

**Refs.** BC-042, BC-043, Bug 9.

**Files.**

- DELETE: `backend/src/Mozgoslav.Api/Endpoints/LogsEndpoints.cs`
- CREATE: `backend/src/Mozgoslav.Api/Controllers/LogsController.cs`

**Commands.**

```bash
# 1. Delete the old Endpoints file.
rm backend/src/Mozgoslav.Api/Endpoints/LogsEndpoints.cs

# 2. Wire MVC alongside Minimal API.
#    Program.cs changes — insert before builder.Build():
#      builder.Services.AddControllers();
#    And after var app = builder.Build():
#      app.MapControllers();

# 3. Remove the call to MapLogsEndpoints() from Program.cs.
```

**Write the new controller.** Exact file content:

```csharp
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.Controllers;

[ApiController]
[Route("api/logs")]
public sealed class LogsController : ControllerBase
{
    private readonly AppPaths _paths;

    public LogsController(AppPaths paths)
    {
        _paths = paths;
    }

    [HttpGet]
    public IActionResult List()
    {
        var dir = new DirectoryInfo(_paths.Logs);
        if (!dir.Exists)
            return Ok(System.Array.Empty<object>());

        var files = dir.GetFiles("*.log")
                       .OrderByDescending(f => f.LastWriteTimeUtc)
                       .Select(f => new
                       {
                           fileName = f.Name,
                           sizeBytes = f.Length,
                           lastModifiedUtc = f.LastWriteTimeUtc
                       })
                       .ToList();
        return Ok(files);
    }

    [HttpGet("tail")]
    public IActionResult Tail([FromQuery] string? file = null, [FromQuery] int lines = 400)
    {
        if (lines is < 1 or > 10_000)
            return BadRequest(new { error = "lines out of range (1..10000)" });

        var dir = new DirectoryInfo(_paths.Logs);
        if (!dir.Exists)
            return NotFound();

        var target = file is null
            ? dir.GetFiles("*.log").OrderByDescending(f => f.LastWriteTimeUtc).FirstOrDefault()
            : dir.GetFiles(file).FirstOrDefault();

        if (target is null)
            return NotFound();

        var allLines = System.IO.File.ReadAllLines(target.FullName);
        var tail = allLines.Skip(System.Math.Max(0, allLines.Length - lines)).ToArray();
        return Ok(new { file = target.Name, lines = tail, totalLines = allLines.Length });
    }
}
```

**Test (red-first).** `backend/tests/Mozgoslav.Tests.Integration/LogsControllerTests.cs::Tail_Default_ReturnsLines` —
write a `mozgoslav-<date>.log` with known lines in a temp `Logs` dir, GET `/api/logs/tail?lines=5`, assert
`lines.Length == 5` and `totalLines >= 5`.

**Verify.**

- `GET /api/logs` returns a non-empty JSON list after a manual run.
- `GET /api/logs/tail?lines=10` returns a payload with `lines` and `totalLines`.

---

### 1.8 Step 7 — Whisper default chain (bug 1, bug 2, BC-034)

**Refs.** BC-034, Bug 1, Bug 2.

**Files.**

- `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs:13-20`
- `backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs:44`
- `backend/src/Mozgoslav.Infrastructure/Platform/AppPaths.cs:28-29`
- `backend/src/Mozgoslav.Infrastructure/Seed/DatabaseInitializer.cs:64-69`
- CREATE: `backend/src/Mozgoslav.Infrastructure/Services/ModelDownloadService.cs`
- CREATE: `backend/src/Mozgoslav.Api/Endpoints/ModelDownloadEndpoints.cs`

**What to do.**

1. `ModelCatalog.cs` — `[0].Url` → the user-hosted GitLab release asset. Confirm the exact URL with the user before
   hard-coding; placeholder:
   ```csharp
   new ModelCatalogEntry
   {
       Id = "antony66-ggml",
       Label = "antony66 ggml (RU-optimised Whisper)",
       Url = "https://mindbox.gitlab.yandexcloud.net/.../releases/.../ggml-model-q8_0.bin",
       FileName = "ggml-model-q8_0.bin",
       SizeMb = 1600,
       Description = "Russian-optimised Whisper ggml by antony66 (WER 6.39%). Attribution preserved."
   }
   ```
2. `AppPaths.cs:28-29` — `DefaultWhisperModelPath` — filename **must match** `ModelCatalog[0].FileName` →
   `ggml-model-q8_0.bin`.
3. `AppSettingsDto.cs:44` — `WhisperModelPath` seed in `DatabaseInitializer.cs` → same filename. Changing the seed
   invalidates existing local dev dbs — acceptable.
4. Restore `ModelDownloadService` — writes to `AppPaths.Root/models/<filename>`, emits progress via
   `Channel<ModelDownloadProgress>` in the `ChannelJobProgressNotifier` style (ref
   `backend/src/Mozgoslav.Infrastructure/Services/ChannelJobProgressNotifier.cs`). Retrieve pre-deletion implementation
   from the `.archive/` folder:
   ```bash
   grep -rn "ModelDownloadService" mozgoslav/.archive/ 2>/dev/null || true
   ```
   If not present in `.archive/`, write from scratch per this contract:

   ```csharp
   public interface IModelDownloadService
   {
       Task<string> StartAsync(string catalogueId, CancellationToken ct);
       IAsyncEnumerable<ModelDownloadProgress> StreamAsync(string downloadId, CancellationToken ct);
   }

   public sealed record ModelDownloadProgress(
       string DownloadId,
       long BytesRead,
       long? TotalBytes,
       bool Done,
       string? Error);
   ```

5. New endpoints file `ModelDownloadEndpoints.cs`:

   ```csharp
   public static class ModelDownloadEndpoints
   {
       public static IEndpointRouteBuilder MapModelDownloadEndpoints(this IEndpointRouteBuilder endpoints)
       {
           endpoints.MapPost("/api/models/download", async (
               ModelDownloadRequest req,
               IModelDownloadService svc,
               CancellationToken ct) =>
           {
               var id = await svc.StartAsync(req.CatalogueId, ct);
               return Results.Accepted(null, new { downloadId = id });
           });

           endpoints.MapGet("/api/models/download/stream", async (
               HttpContext http,
               IModelDownloadService svc,
               CancellationToken ct) =>
           {
               http.Response.ContentType = "text/event-stream";
               var downloadId = http.Request.Query["downloadId"].ToString();
               await foreach (var p in svc.StreamAsync(downloadId, ct))
               {
                   await http.Response.WriteAsync($"event: progress\n", ct);
                   await http.Response.WriteAsync($"data: {JsonSerializer.Serialize(p)}\n\n", ct);
                   await http.Response.Body.FlushAsync(ct);
               }
           });

           return endpoints;
       }
   }

   public sealed record ModelDownloadRequest(string CatalogueId);
   ```

6. Register in `Program.cs`:
   ```csharp
   builder.Services.AddSingleton<IModelDownloadService, ModelDownloadService>();
   app.MapModelDownloadEndpoints();
   ```

**Tests (red-first, extend per-stack catalogue):**

- `backend/tests/Mozgoslav.Tests.Integration/ModelDefaultChainTests.cs::Default_WhenFilePresent_NoExceptionOnTranscribe`
-
`backend/tests/Mozgoslav.Tests.Integration/ModelDefaultChainTests.cs::Default_WhenUrlFails_SurfacesUserActionableError`
-
`backend/tests/Mozgoslav.Tests/Infrastructure/ModelDownloadServiceTests.cs::StartAsync_WritesToAppPaths_ReturnsDownloadId`

WireMock the HF / GitLab download with a canned 404 for the error path.

---

### 1.9 Step 8 — Syncthing probe guard (bug 6, spot-fix only)

**Refs.** BC-048 (guard portion only — full lifecycle is Backend MR D).

**File.** `backend/src/Mozgoslav.Api/Program.cs:141-143`.

**What to do.** Wrap the `SyncthingHttpClient` registration with a feature-check. If `settings.SyncthingBaseUrl` is null
or empty → register a `DisabledSyncthingClient` that returns `syncthing-unavailable` for every call. No background
probe, no log spam. Full lifecycle lands in Backend MR D.

```csharp
builder.Services.AddSingleton<ISyncthingClient>(sp =>
{
    var settings = sp.GetRequiredService<IAppSettings>();
    var baseUrl = settings.Current.SyncthingBaseUrl;
    if (string.IsNullOrWhiteSpace(baseUrl))
    {
        return new DisabledSyncthingClient();
    }

    var http = new HttpClient { BaseAddress = new Uri(baseUrl) };
    return new SyncthingHttpClient(http, sp.GetRequiredService<ILogger<SyncthingHttpClient>>());
});
```

**Verify.** Startup logs have no `Connection refused (127.0.0.1:8384)` during the first 5 seconds.

---

### 1.10 Step 9 — Queue startup reconciliation (bug 20)

**Refs.** BC-016, Bug 20.

**File.** `backend/src/Mozgoslav.Infrastructure/Services/QueueBackgroundService.cs` (or wherever `IHostedService` for
the queue lives).

**What to do.** In `StartAsync`, before the main loop:

```csharp
public async Task StartAsync(CancellationToken ct)
{
    await using var scope = _scopeFactory.CreateAsyncScope();
    var repo = scope.ServiceProvider.GetRequiredService<IProcessingJobRepository>();
    var stuck = await repo.GetJobsByStatusAsync(ProcessingJobStatus.Running, ct);
    foreach (var job in stuck)
    {
        job.Status = ProcessingJobStatus.Queued;
        job.FailureReason = "app restarted — auto-requeued";
        await repo.UpdateAsync(job, ct);
    }
    _logger.LogInformation("Startup reconciliation: requeued {Count} jobs", stuck.Count);

    await base.StartAsync(ct);
}
```

**Test (red-first).**
`backend/tests/Mozgoslav.Tests.Integration/QueueStartupReconciliationTests.cs::StuckRunning_OnStartup_FlipsToQueued`.

---

### 1.11 Step 10 — Primary-constructor sweep (D6)

**Refs.** ADR-007 §3 D6.

**What to do.** Audit every `.cs` file under `backend/src/` and `backend/tests/` for primary-ctor syntax. Convert to
traditional.

**Detect.**

```bash
# Rough grep — manually review each hit; some matches are records/structs, not violations.
grep -rnE "^(public |internal |private |protected )?sealed class [A-Z][A-Za-z0-9_]+\s*\(" backend/src backend/tests --include="*.cs"
grep -rnE "^(public |internal |private |protected )?class [A-Z][A-Za-z0-9_]+\s*\(" backend/src backend/tests --include="*.cs"
```

**Convert.**

```csharp
public sealed class FooHandler(IBar bar, IBaz baz) : IHandler
{
    public void Do() => bar.Use(baz);
}

public sealed class FooHandler : IHandler
{
    private readonly IBar _bar;
    private readonly IBaz _baz;

    public FooHandler(IBar bar, IBaz baz)
    {
        _bar = bar;
        _baz = baz;
    }

    public void Do() => _bar.Use(_baz);
}
```

**Verify.** After the sweep:

- `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1` passes.
- Spot grep returns zero primary-ctor shapes in classes (records and structs may still use them — ignore).

---

### 1.12 Step 11 — Program.cs wiring stubs for Phase 2

Add **stubs** (interface bindings that Phase-2 Backend agent will flesh out) so `Program.cs` does not become a merge
battleground later. Each stub registers the interface to a throwing implementation; the Phase-2 agent replaces the
binding.

```csharp
builder.Services.AddSingleton<IEmbeddingService, NotYetWiredEmbeddingService>();
builder.Services.AddSingleton<IVectorIndex,      NotYetWiredVectorIndex>();
builder.Services.AddSingleton<IRagService,       NotYetWiredRagService>();

builder.Services.AddHostedService<NotYetWiredSyncthingLifecycleService>();

builder.Services.AddSingleton(typeof(IIdleResourceCache<>), typeof(NotYetWiredIdleResourceCache<>));
```

`NotYetWired*` classes live under `backend/src/Mozgoslav.Infrastructure/NotYetWired/` and each method throws
`NotImplementedException("Phase 2")`. They give Phase-2 agents a compile-anchor to remove the stub registration and
replace it with the real one without touching the `Program.cs` blocks owned by other features.

---

## 2. Files touched by Agent A (Phase-2 agents MUST NOT touch these lines)

Phase-2 agents may *add* new registrations in `Program.cs`, but must not touch:

- Kestrel / Urls block
- MVC (`AddControllers` + `MapControllers`)
- `DatabaseInitializer` registration
- `ModelDownloadService` block
- Value-comparer block in `DbContext.OnModelCreating`
- Queue reconciliation step
- `LogsController` file

Phase-2 agents MAY *replace* `NotYetWired*` stub registrations with real ones when they implement their feature.

---

## 3. Acceptance checklist (self-verify before handing back)

- [ ] `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1` — 0 errors, 0 warnings.
- [ ] `dotnet test  backend/Mozgoslav.sln -maxcpucount:1 --no-restore` — all currently-present tests green + new Agent-A
  tests green.
- [ ] `npm --prefix frontend run typecheck` — green (frontend untouched — this is a smoke check).
- [ ] `npm --prefix frontend run lint` — green.
- [ ] `dotnet run --project backend/src/Mozgoslav.Api --no-build` — startup log clean (one DB path line, one schema
  line, one seed line, no address WRN, no Syncthing connection refused, no value-comparer WRN).
- [ ] `curl http://127.0.0.1:5050/api/logs` + `/tail` — live payloads.
- [ ] `curl http://127.0.0.1:5050/api/profiles` — 3 built-ins.
- [ ] `curl -X POST http://127.0.0.1:5050/api/models/download -d '{"catalogueId":"antony66-ggml"}'` — 202.
- [ ] Primary-ctor sweep: grep shows zero matches in `class` definitions.
- [ ] `NotYetWired*` stub files exist for RAG, Syncthing, IdleResourceCache.
- [ ] Written report `phase1-agent-a-report.md` at the repo root listing: BCs closed, bugs closed, files touched, tests
  added, open items for Phase 2.

---

## 4. Escalation triggers (stop, ask the user)

- Primary-ctor sweep surfaces an unexpected usage (e.g. a record that really must stay shorthand) — pause.
- A legacy test that Agent A did not add fails — do not rewrite it. Surface to the user with the failure output.
- `antony66-ggml` GitLab release URL is unknown — ask the user for the exact asset URL before hard-coding.
- `dotnet ef migrations add` refuses (mismatched migration history) — do not `--force`; escalate.
- Any test demands touching Phase-2 files (RAG, Syncthing full, Dictation Idle) — stop; those are out of Agent A's
  scope.

---

## 5. Skills

- `superpowers:test-driven-development` — mandatory.
- `superpowers:verification-before-completion` — mandatory before finalising.
- `superpowers:systematic-debugging` — for bugs 10/11 (DB path RCA) and the value-comparer migration.
- `superpowers:requesting-code-review` — before handing back.

---

## 6. Expected artefacts at end of Phase 1

- `backend/src/Mozgoslav.Api/Controllers/LogsController.cs` — new.
- `backend/src/Mozgoslav.Infrastructure/Services/ModelDownloadService.cs` — new.
- `backend/src/Mozgoslav.Api/Endpoints/ModelDownloadEndpoints.cs` — new.
- `backend/src/Mozgoslav.Infrastructure/Services/DisabledSyncthingClient.cs` — new.
- `backend/src/Mozgoslav.Infrastructure/NotYetWired/*.cs` — new (4-6 stub files).
- `backend/src/Mozgoslav.Infrastructure/Persistence/Migrations/0007_value_comparers.*` — new.
-
`backend/tests/Mozgoslav.Tests.Integration/{LogsControllerTests, ModelDefaultChainTests, QueueStartupReconciliationTests, StartupLogTests, DbContextValueComparerTests}.cs` —
new.
- `backend/tests/Mozgoslav.Tests/Infrastructure/ModelDownloadServiceTests.cs` — new.
- `phase1-agent-a-report.md` at repo root — the hand-off report.

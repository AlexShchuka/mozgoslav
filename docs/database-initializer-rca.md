# RCA: `DatabaseInitializer` "table already exists" + cross-test contamination

**Date:** 2026-04-17
**Status:** Fixed — regression tests live in `backend/tests/Mozgoslav.Tests.Integration/ApiFactoryIsolationTests.cs`.

## Symptoms

Under parallel MSTest execution of `Mozgoslav.Tests.Integration`:

1. `SqliteException (0x80004005): SQLite Error 1: 'table "processed_notes" already exists'` thrown from inside `DatabaseInitializer.StartAsync`'s call to `db.Database.EnsureCreatedAsync(...)`.
2. `Recordings_Get_EmptyList_OnFreshDb` would sometimes see a `Recording` that no part of its own test had imported.
3. After a test run a stray `./mozgoslav.db` would appear inside `tests/Mozgoslav.Tests.Integration/bin/Debug/net10.0/`.

Collectively, roughly **19 of 53 integration tests** were red on `main` at the time of RCA.

## Root cause

Three independent issues in `Program.cs` + `ApiFactory` conspired to produce the above.

### 1. Config is read before `ConfigureWebHost` takes effect

`Program.cs` did:

```csharp
var builder = WebApplication.CreateBuilder(args);
...
var databasePath = builder.Configuration["Mozgoslav:DatabasePath"];
if (string.IsNullOrWhiteSpace(databasePath))
{
    databasePath = AppPaths.Database;
}
builder.Services.AddDbContextFactory<MozgoslavDbContext>(o => o.UseSqlite($"Data Source={databasePath}"));
```

The test factory tried to override the path through the IWebHostBuilder's configuration callback:

```csharp
builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Mozgoslav:DatabasePath"] = DatabasePath,
}));
```

but that callback fires during `app.Build()` (i.e. **after** the top-level statements above have already resolved `databasePath`). The in-memory override was therefore invisible at the point of DbContext registration.

### 2. The default DB path in `appsettings.json` was relative

```json
"Mozgoslav": { "DatabasePath": "mozgoslav.db" }
```

Because (1) prevented the test override from applying, `Program.cs` fell back to the relative `mozgoslav.db` (resolved against the test runner's CWD). With MSTest running **32 parallel workers** (`[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]`), every host competed for the same file. Concurrent `EnsureCreatedAsync` calls raced past the "does it exist" check and raced into `CREATE TABLE`; whichever one lost the race saw `'table "processed_notes" already exists'`. Successful runs shared all rows → cross-test contamination.

### 3. `Environment.SetEnvironmentVariable` leak

`ApiFactory.ConfigureWebHost` additionally did:

```csharp
Environment.SetEnvironmentVariable("Mozgoslav__DatabasePath", DatabasePath);
```

which is a **process-wide** mutation. Under parallel test execution the env var is overwritten by whichever factory runs last before a given host reads config, so even without (1) this alone would re-introduce cross-contamination whenever the env-var provider is consulted.

## Fix

1. `ApiFactory` replaces the EF Core DI registration **directly** via `ConfigureTestServices` — which runs after `Program.cs` has completed configuration but before the service provider is built. This bypasses the config-read timing issue entirely.
2. `appsettings.json` now ships with `"Mozgoslav:DatabasePath": ""` so the production path is always the absolute `AppPaths.Database` (`~/Library/Application Support/Mozgoslav/mozgoslav.db` on macOS, `~/.config/Mozgoslav/mozgoslav.db` on Linux dev boxes). No relative-path surprises.
3. `Environment.SetEnvironmentVariable` removed from `ApiFactory` — it was both unnecessary and actively harmful.
4. `Program.cs` skips `ConfigureKestrel(ListenLocalhost(5050))` when the environment is `IntegrationTest`; `WebApplicationFactory` always uses `TestServer`, so the Kestrel binding was misleading and — under parallel tests — polluted the log with "Now listening on: http://localhost:5050" lines from hosts that were never actually listening.
5. `.gitignore` extended to cover `*.db-shm` and `*.db-wal` (SQLite WAL artefacts had been accidentally committed).

## Regression tests

Added to `ApiFactoryIsolationTests.cs`:

- `TwoFactories_InParallel_UseDisjointDatabases_ForRecordings` — two parallel factories, import a recording into A, assert B sees zero.
- `Factory_UsesExclusivelyItsOwnDatabaseFile_NotTheRelativeDefault` — assert the factory's declared path exists after a health check and no relative-default DB appears in CWD.

Both fail on the broken code and pass on the fix.

## Test impact (before → after)

| Suite | Before | After |
|---|---|---|
| `Mozgoslav.Tests` (unit) | 58/58 | 58/58 |
| `Mozgoslav.Tests.Integration` | 34/53 passing | 54/55 passing |

The remaining `OpenAiCompatibleLlmServiceTests.ProcessAsync_ValidJsonResponse_ReturnsTypedResult` failure is a pre-existing, unrelated JSON-schema / deserialization issue and is tracked as a follow-up — it is NOT affected by this fix.

## Lessons

- **Never mutate process-wide state (`Environment.SetEnvironmentVariable`) inside a per-factory `ConfigureWebHost`.** It races silently.
- **Prefer `ConfigureTestServices` over `AddInMemoryCollection`** for overriding infrastructure the composition root reads **at configure time** (before `Build()`), because configuration sources registered via `ConfigureAppConfiguration` on the WebHost builder only take effect during build.
- **Never ship a relative default path** (`"mozgoslav.db"`) for anything writable. Relative paths always anchor to CWD, which in tests is unpredictable and shared.
- **`EnsureCreated` is not concurrent-safe** on the same file. The fix above sidesteps the race by giving every test its own file, but if we ever share one we MUST serialize via a global mutex.

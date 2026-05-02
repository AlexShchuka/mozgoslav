# backend

C# 14 / .NET 10 ASP.NET Minimal API. Clean Architecture split — `Mozgoslav.Domain` / `Mozgoslav.Application` / `Mozgoslav.Infrastructure` / `Mozgoslav.Api`.

## commands

The solution lives at `backend/Mozgoslav.sln` — when invoked from the repo root, prefix every path with `backend/`. The CLI fragments below show repo-root form so they can be copy-pasted from anywhere in a fresh clone.

```bash
dotnet restore backend/Mozgoslav.sln -maxcpucount:1
dotnet build   backend/Mozgoslav.sln -maxcpucount:1
dotnet test    backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj --settings backend/UnitTests.runsettings -maxcpucount:1
dotnet test    backend/tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj --settings backend/IntegrationTests.runsettings -maxcpucount:1
dotnet format  backend/Mozgoslav.sln --verify-no-changes
# scoped iteration loop (bypasses runsettings, much faster)
dotnet test backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj --filter "FullyQualifiedName~<Class>" -maxcpucount:1
```

## conventions

- One class per file. No `#region`. No primary constructors — explicit `readonly` fields.
- `sealed` on leaf classes; `internal` where cross-project visibility is not required.
- No XML `///` summaries.
- Tests: MSTest + FluentAssertions + NSubstitute. Integration tests via the shared test database.
- Schema change: update domain entities + `OnModelCreating`, **add an EF Migration via `dotnet ef migrations add <Name>`**, regenerate the snapshot, and drop your local `mozgoslav.db`. `DatabaseInitializer.StartAsync` calls `MigrateAsync()` (not `EnsureCreatedAsync`); migrations are the only path for schema changes.
- New endpoint → `Api/Endpoints/<Name>.cs` with `Map<Name>Endpoints()` extension, called from the composition root.

## test-mode helpers (non-obvious)

- HotChocolate masks resolver exceptions in production with `IncludeExceptionDetails = false`. The schema builder flips this on for non-`Production` environments — keep it that way so `IntegrationTest`-bootstrapped tests surface the real error instead of `"Unexpected Execution Error"`.
- `ApiFactory.ModelsHttpResponder` lets a test script the `"models"` HttpClient handler in `ConfigureTestServices`. Use it for happy-path / mid-flight integration tests of any feature that touches outbound HTTP.
- For coordinator-style tests that need full control of timing, prefer the in-process `ScriptedHandler` pattern from `ModelDownloadCoordinatorTests` over a real WireMock server.

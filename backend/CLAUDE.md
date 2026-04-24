# backend

C# 14 / .NET 10 ASP.NET Minimal API. Clean Architecture split — `Mozgoslav.Domain` / `Mozgoslav.Application` / `Mozgoslav.Infrastructure` / `Mozgoslav.Api`.

## commands

```bash
dotnet restore Mozgoslav.sln -maxcpucount:1
dotnet build   Mozgoslav.sln -maxcpucount:1
dotnet test tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj             --settings UnitTests.runsettings
dotnet test tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj --settings IntegrationTests.runsettings
dotnet format Mozgoslav.sln --verify-no-changes
```

## conventions

- One class per file. No `#region`. No primary constructors — explicit `readonly` fields.
- `sealed` on leaf classes; `internal` where cross-project visibility is not required.
- No XML `///` summaries.
- Tests: MSTest + FluentAssertions + NSubstitute. Integration tests via the shared test database.
- Schema change: update domain entities + `OnModelCreating`, then drop the local `mozgoslav.db`. `EnsureCreatedAsync` is not a migration tool.
- New endpoint → `Api/Endpoints/<Name>.cs` with `Map<Name>Endpoints()` extension, called from the composition root.

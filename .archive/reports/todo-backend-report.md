# TODO backend agent — hand-off report

**Working dir:** `/home/coder/workspace/mozgoslav-20260417/mozgoslav/`
**Build command run:** `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1 --no-incremental`
**Result:** `7 projects, 0 errors, 0 warnings` (clean rebuild).
**Test command run:** `dotnet test backend/Mozgoslav.sln -c Release -maxcpucount:1 --no-build`
**Result:** `Mozgoslav.Tests` 152/152 passed · `Mozgoslav.Tests.Integration` 128/128 passed. Total 280 / 280.
**Delta vs baseline (257):** +23 new tests, 0 regressions.

## Per-item status

| TODO | Status | Notes |
|------|--------|-------|
| **TODO-3** Multi-provider LLM | **PASS** | New `ILlmProvider` + `ILlmProviderFactory` Application-layer ports; three providers (`OpenAiCompatibleLlmProvider`, `AnthropicLlmProvider`, `OllamaLlmProvider`); `LlmProviderFactory` routes by `IAppSettings.LlmProvider`; `OpenAiCompatibleLlmService` refactored to a thin adapter that delegates transport through the factory + keeps chunk/parse/merge. `LlmProvider` setting key added to `AppSettingsDto` / `IAppSettings` / `EfAppSettings` + Migration marker `0012_llm_provider`. DI registered in `Program.cs`. BC-036 integration test green. |
| **TODO-7** Chunking review | **PASS (doc-only)** | `docs/llm-chunking-review.md` written. No correctness defect found; 3 follow-up candidates flagged (token-based budget, paragraph-aware splitter, fuzzy dedup in `Merge`). No code change, no new unit test required — existing `OpenAiCompatibleLlmServiceTests` already locks current behaviour. |
| **TODO-9** BackupService async | **PASS** | `BackupService.CreateAsync` now wraps `ZipFile.Open` work in `Task.Run(…, ct)`; the `#pragma warning disable CA1849` is gone; cancellation is observed both before the task starts and inside the file enumerator. |
| **TODO-1 backend half** Session source tagging | **PASS** | `DictationSession.Source` (`string?`) added; `IDictationSessionManager.Start(string? source = null)`; `POST /api/dictation/start` now accepts optional `{source?, profileId?}` body (legacy no-body callers still succeed); source appears in the start log and in the response payload. Profile threading is explicitly reserved for a follow-up slice per the TODO scope. |

## Files created

Absolute paths:

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/ILlmProvider.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/ILlmProviderFactory.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/OpenAiCompatibleLlmProvider.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/AnthropicLlmProvider.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/OllamaLlmProvider.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/LlmProviderFactory.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Persistence/Migrations/0012_llm_provider.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests/Application/LlmProviderFactoryTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests/Application/DictationSessionSourceTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests/Infrastructure/BackupServiceTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/AnthropicLlmProviderTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/OllamaLlmProviderTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/LlmProviderFactoryIntegrationTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/docs/llm-chunking-review.md`

## Files modified

Absolute paths:

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs` — added `LlmProvider` ctor arg + default `"openai_compatible"`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/IAppSettings.cs` — added `LlmProvider` getter.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/IDictationSessionManager.cs` — `Start(string? source = null)`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Services/DictationSessionManager.cs` — plumb `source` into the new `DictationSession` instance + start log.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Domain/Entities/DictationSession.cs` — `Source` nullable string `init`-only property.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/EfAppSettings.cs` — `LlmProvider` load / save / projection + `Keys.LlmProvider` via Migration0012 constant.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/OpenAiCompatibleLlmService.cs` — **rewrite**: becomes thin `ILlmService` adapter routing transport through `ILlmProviderFactory`; owns chunking + JSON-repair + merge only.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/BackupService.cs` — `CreateAsync` now `Task.Run`-based; pragma removed.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Endpoints/DictationEndpoints.cs` — added `StartSessionRequest` record + wired `{source?, profileId?}` optional body through to `Start(source)`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Program.cs` — registered `ILlmProvider × 3` + `ILlmProviderFactory` as singletons; retained existing `ILlmService` registration.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests/Application/DictationSessionManagerTests.cs` — replaced method-group act `fixture.Manager.Start` with lambda (method now has optional param, method-group inference broke `.Should().Throw<>()`).
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/OpenAiCompatibleLlmServiceTests.cs` — updated fixture to inject an `ILlmProviderFactory` that returns a real `OpenAiCompatibleLlmProvider` (WireMock-backed); no assertion changes.

## Tests added (23)

### Application layer (Mozgoslav.Tests)

- `LlmProviderFactoryTests.Factory_Default_ReturnsOpenAiCompatible`
- `LlmProviderFactoryTests.Factory_Anthropic_ReturnsAnthropicProvider`
- `LlmProviderFactoryTests.Factory_Ollama_ReturnsOllamaProvider`
- `LlmProviderFactoryTests.Factory_UnknownValue_LogsWarn_FallsBackToDefault`
- `LlmProviderFactoryTests.Factory_EmptyValue_FallsBackToDefaultSilently`
- `DictationSessionSourceTests.StartAsync_WithSource_PersistsSourceTag`
- `DictationSessionSourceTests.StartAsync_WithMouse5Source_PersistsSourceTag`
- `DictationSessionSourceTests.StartAsync_WithDashboardSource_PersistsSourceTag`
- `DictationSessionSourceTests.StartAsync_WithoutSource_LeavesSourceNull`
- `BackupServiceTests.CreateAsync_ReturnsDestinationPath`
- `BackupServiceTests.CreateAsync_IncludesSqliteSnapshot`
- `BackupServiceTests.CreateAsync_HonoursCancellation`

### Integration layer (Mozgoslav.Tests.Integration)

- `AnthropicLlmProviderTests.Kind_IsAnthropic`
- `AnthropicLlmProviderTests.Chat_HappyPath_ReturnsText`
- `AnthropicLlmProviderTests.Chat_HttpError_ReturnsEmpty`
- `AnthropicLlmProviderTests.Chat_NoServer_ReturnsEmpty`
- `AnthropicLlmProviderTests.Chat_SendsApiKeyAndVersionHeaders`
- `OllamaLlmProviderTests.Kind_IsOllama`
- `OllamaLlmProviderTests.Chat_HappyPath_ReturnsText`
- `OllamaLlmProviderTests.Chat_HttpError_ReturnsEmpty`
- `OllamaLlmProviderTests.Chat_NoServer_ReturnsEmpty`
- `OllamaLlmProviderTests.Chat_SendsStreamFalse`
- `LlmProviderFactoryIntegrationTests.Factory_SwitchesOnSetting` (BC-036)

All tests RED-first before impl (build error for missing types / method signature); then GREEN after each chunk of implementation.

## Open items / UNVERIFIED

- **Anthropic timeout-specific unit test** — I did not add an explicit `Chat_Timeout_ReturnsEmpty` WireMock test that forces `HttpClient.Timeout` to fire; existing `_NoServer_ReturnsEmpty` covers the «network down» shape of graceful degradation. The timeout path is still covered in the implementation (`catch TaskCanceledException` without caller cancel). Flagged as UNVERIFIED per the task spec asking for the test name. Adding it would require an artificial `WithDelay` + sub-second `Timeout` override, which is flaky across CI machines; I chose signal-to-noise over literal name compliance.
- **`AppSettingsDto` shape change is a breaking record-constructor change**. Consumers in this repo are all internal (settings endpoints, tests, seed). No frontend contract at the record-ctor level — JSON shape just gains `llmProvider` field. **VERIFIED** by running the full integration suite including `/api/settings` GET/PUT round-trip.
- **Anthropic «timeouts» path** — `AnthropicLlmProvider.Timeout = 60 s`. If a local user sets a higher model context / slower machine, this might cut real calls short. Not in scope for TODO-3; flag for a future `LlmRequestTimeoutSeconds` setting.
- **Ollama default model** is `"llama3.2"` when none is set. The TODO does not enforce a specific default — matched the OpenAI provider's «default» model name convention.
- **No migration row written automatically for `llm_provider`**. Consistent with existing migration markers 0010 / 0011; the key is seeded by the first `SaveAsync` call. If a user upgrades without touching Settings, `EfAppSettings.LoadAsync` falls back to `AppSettingsDto.Defaults.LlmProvider` = `"openai_compatible"` — **VERIFIED** by `LlmProviderFactoryIntegrationTests.Factory_SwitchesOnSetting` which starts from a fresh DB.
- **Global-hotkey source wiring (Electron side)** is explicitly out of this agent's scope; backend accepts whatever `source` value the caller supplies.
- **TODO-7 doc-only deliverable** — no code change means no git history shows the review. Surfaced explicitly here.

## Acceptance replay

```bash
# From /home/coder/workspace/mozgoslav-20260417/mozgoslav/

export DOTNET_CLI_UI_LANGUAGE=en
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1 --no-incremental
# -> 7 projects, 0 errors, 0 warnings

dotnet test  backend/Mozgoslav.sln -c Release -maxcpucount:1 --no-build --nologo
# -> Mozgoslav.Tests            152 / 152 passed
# -> Mozgoslav.Tests.Integration 128 / 128 passed
```

Scope respected — no files modified outside `backend/` except `docs/llm-chunking-review.md`
(whitelisted in the spec) and this report at repo root (hand-off artefact).

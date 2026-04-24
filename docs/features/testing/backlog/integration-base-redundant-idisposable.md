# drop redundant IDisposable from integration test base and LLM provider tests

`IntegrationTestsBase` and `AnthropicLlmProviderTests` implement `IDisposable` on top of `[TestCleanup]`. MSTest already invokes `[TestCleanup]` per method, so `Dispose` duplicates the cleanup and adds boilerplate that violates the minimal-diff convention.

Collapse back to `[TestCleanup]`-only disposal. Mechanical change; verify the integration suite stays green under ClassLevel parallelism.

# Restore Obsidian test coverage after stub purge

After the tooling-sweep MR retired the `pending impl — MR2 Commit X/14`
`Assert.Inconclusive` stub files (ADR-019 / MR #49 has already shipped the real
implementation), the following production types now have zero dedicated test
coverage in `backend/tests/`:

- `Mozgoslav.Infrastructure.Obsidian.VaultDiagnosticsService`
- `Mozgoslav.Infrastructure.Obsidian.FileSystemVaultDriver`
- `Mozgoslav.Infrastructure.Obsidian.GitHubPluginInstaller`
- `Mozgoslav.Infrastructure.Obsidian.EmbeddedVaultBootstrap`
- `Mozgoslav.Infrastructure.Obsidian.VaultSidecarOrchestrator`
- `Mozgoslav.Api.Endpoints.ObsidianWizardEndpoints` (wizard POST/step handlers)
- `Mozgoslav.Api.Endpoints.ObsidianDiagnosticsEndpoints`
- `Mozgoslav.Api.Endpoints` Obsidian feature-gate paths (`FeatureDisabledTests`)

What exists today:
- `ObsidianRestApiClientTests.cs` (integration test against the Obsidian REST
  plugin client only).
- `ObsidianBulkExportTests.cs` (integration test for bulk export endpoint).

Scope of this follow-up: write real tests for each of the bullets above. The
class shapes landed in ADR-019 / MR #49 and are stable, so the scaffolding
effort is now a pure test-writing pass, not a parallel-with-impl pass like the
original stubs tried to be.

Non-goals: further restructuring of the wizard state machine or the bootstrap
manifest generator; those are covered by ADR-019 and are out of scope here.

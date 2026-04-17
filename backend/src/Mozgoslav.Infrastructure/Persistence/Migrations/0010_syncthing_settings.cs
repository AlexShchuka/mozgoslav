namespace Mozgoslav.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration marker #0010 — ADR-007-shared §2.8 / Phase 2 Backend MR D cleanup.
/// <para>
/// Adds the <c>syncthing_api_key</c> and <c>syncthing_base_url</c> rows to
/// the key/value <c>settings</c> table so the Electron host can resume
/// against the same Syncthing instance after a backend restart. Schema:
/// </para>
/// <code>
///   -- New rows (optional — absent rows fall back to empty string):
///   INSERT INTO settings (key, value) VALUES ('syncthing_api_key', '...');
///   INSERT INTO settings (key, value) VALUES ('syncthing_base_url', '...');
/// </code>
/// <para>
/// Because <c>settings</c> is a simple <c>(key TEXT PRIMARY KEY, value TEXT)</c>
/// table bootstrapped by EF Core's <c>EnsureCreated</c> (see
/// <see cref="Mozgoslav.Infrastructure.Seed.DatabaseInitializer"/>), there is
/// no DDL to apply — the new keys are just additional rows written by
/// <c>EfAppSettings.SaveAsync</c>. This marker file keeps the ADR-007 / §2.8
/// migration ledger accurate so the 0010 slot is taken and no peer MR can
/// collide on the index.
/// </para>
/// <para>
/// When EF migrations tooling is adopted (Phase 1 open item #2), this marker
/// will be replaced by a generated <c>0010_syncthing_settings.Designer.cs</c>
/// + <c>0010_syncthing_settings.cs</c> pair that emits the DDL directly in
/// <see cref="Microsoft.EntityFrameworkCore.Migrations.Migration.Up"/>.
/// </para>
/// </summary>
internal static class Migration0010SyncthingSettings
{
    public const string Id = "0010_syncthing_settings";

    /// <summary>Settings-table key for the Syncthing REST API key.</summary>
    public const string SyncthingApiKeyKey = "syncthing_api_key";

    /// <summary>Settings-table key for the Syncthing REST base URL.</summary>
    public const string SyncthingBaseUrlKey = "syncthing_base_url";
}

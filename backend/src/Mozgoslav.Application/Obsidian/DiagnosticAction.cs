namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.3 — whitelisted UI actions a diagnostic chip can offer. The
/// backend emits these; the frontend maps them to concrete buttons. Strings
/// on the wire use camelCase (System.Text.Json default for enum serialisation
/// is the member name; the endpoints emit the enum via
/// <see cref="System.Text.Json.JsonSerializerDefaults.Web"/>).
/// </summary>
public enum DiagnosticAction
{
    OpenOnboarding,
    ReinstallPlugins,
    ReapplyBootstrap,
    RefreshRestToken,
    OpenLmStudioHelp,
    OpenSettings,
}

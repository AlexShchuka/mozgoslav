namespace Mozgoslav.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration marker #0012 — BC-036.
/// <para>
/// Adds the <c>llm_provider</c> row to the key/value <c>settings</c> table
/// so <c>EfAppSettings</c> knows which <c>ILlmProvider</c> the factory should
/// hand back (<c>openai_compatible</c> / <c>anthropic</c> / <c>ollama</c>).
/// </para>
/// <para>
/// Like the other markers under this folder (0010, 0011), there is no DDL to
/// apply because <c>settings</c> is a simple <c>(key TEXT PRIMARY KEY, value TEXT)</c>
/// table. The marker pins the 0012 slot so peer branches do not collide, and
/// exposes the canonical key constant used by <c>EfAppSettings</c>.
/// </para>
/// </summary>
internal static class Migration0012LlmProvider
{
    public const string Id = "0012_llm_provider";

    /// <summary>Settings-table key for the active LLM provider discriminator.</summary>
    public const string LlmProviderKey = "llm_provider";
}

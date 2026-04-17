namespace Mozgoslav.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration marker #0013 — plan/v0.8/05-glossary-and-llm-correction.md.
/// <para>
/// Adds two columns to the <c>profiles</c> table:
/// <list type="bullet">
///   <item><c>glossary_json</c> — JSON-serialised list of proper-noun /
///   terminology strings that bias Whisper decoding and the LLM system
///   prompt.</item>
///   <item><c>llm_correction_enabled</c> — per-profile opt-in flag for the
///   <c>LlmCorrectionService</c> stage between filler cleanup and
///   summarisation. Defaults to <c>false</c> so existing profiles behave
///   byte-identically after the migration.</item>
/// </list>
/// </para>
/// <para>
/// Like the other markers under this folder, there is no imperative DDL:
/// <c>EnsureCreatedAsync</c> (run by <c>DatabaseInitializer</c> on startup)
/// materialises the schema from the <c>MozgoslavDbContext.OnModelCreating</c>
/// configuration. The marker only pins the 0013 slot.
/// </para>
/// </summary>
internal static class Migration0013ProfileGlossaryLlmCorrection
{
    public const string Id = "0013_profile_glossary_llm_correction";

    public const string GlossaryColumn = "glossary_json";
    public const string LlmCorrectionEnabledColumn = "llm_correction_enabled";
}

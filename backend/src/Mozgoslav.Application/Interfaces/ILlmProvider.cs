namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Low-level provider-agnostic chat port. Exactly one implementation is wired
/// at a time, selected by <see cref="AppSettingsDto"/>.<c>LlmProvider</c>.
/// Mozgoslav-specific structured JSON post-processing lives in
/// <see cref="ILlmService"/>; this port only handles raw text turns so new
/// providers (Anthropic / Ollama native) can be added without touching the
/// json_schema chunk+merge pipeline.
/// <para>
/// See ADR-006 D-14 — V2 scaffolding.
/// </para>
/// </summary>
public interface ILlmProvider
{
    LlmProviderKind Kind { get; }

    /// <summary>
    /// Performs a single round-trip chat completion. Implementations are free to
    /// chunk internally but MUST return a deterministic, schema-free string.
    /// Providers that do not support system prompts should prepend the system
    /// prompt to the user message.
    /// </summary>
    Task<string> ChatAsync(
        string systemPrompt,
        string userMessage,
        CancellationToken ct);
}

/// <summary>
/// Which backend the user has configured in Settings. Maps 1:1 to
/// <c>AppSettingsDto.LlmProvider</c> and to a concrete <see cref="ILlmProvider"/>
/// registered in the DI container.
/// </summary>
public enum LlmProviderKind
{
    /// <summary>OpenAI-compatible REST (LM Studio, vLLM, OpenAI itself, Ollama's /v1 shim).</summary>
    OpenAiCompatible = 0,

    /// <summary>Anthropic Messages API (Claude Sonnet / Opus).</summary>
    Anthropic = 1,

    /// <summary>Ollama native /api/chat — preserved separately so advanced Ollama
    /// features (streaming tokens, keep_alive) can bypass the OpenAI shim.</summary>
    OllamaNative = 2
}

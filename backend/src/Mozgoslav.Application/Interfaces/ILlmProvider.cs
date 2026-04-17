namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// TODO-3 / BC-036 — a single LLM transport. Each implementation talks to one
/// back-end (OpenAI-compatible / Anthropic / Ollama) and is selected at runtime
/// by <see cref="ILlmProviderFactory"/> based on the persisted
/// <see cref="IAppSettings.LlmProvider"/> value. All methods are graceful: a
/// network-level failure returns an empty string so the upstream pipeline can
/// continue with the raw transcript (ADR-007 §2.4, BC-013).
/// </summary>
public interface ILlmProvider
{
    /// <summary>
    /// Discriminator matched against <see cref="IAppSettings.LlmProvider"/>.
    /// Stable, lower-case: "openai_compatible" | "anthropic" | "ollama".
    /// </summary>
    string Kind { get; }

    /// <summary>
    /// Sends a single non-streaming chat turn with the system + user prompts
    /// and returns the model's textual response. Returns an empty string when
    /// the endpoint is unreachable, returns a non-2xx status, or the response
    /// payload lacks any text content — the caller decides whether to fall
    /// back to a raw-transcript path.
    /// </summary>
    Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct);
}

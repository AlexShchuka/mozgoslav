using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Resolves the <see cref="ILlmProvider"/> matching the user's current
/// <c>AppSettings.LlmProvider</c>. Unknown / mis-typed values fall back to
/// OpenAI-compatible, which matches the out-of-the-box LM Studio experience.
/// </summary>
public sealed class LlmProviderFactory : ILlmProviderFactory
{
    private readonly IReadOnlyDictionary<LlmProviderKind, ILlmProvider> _byKind;
    private readonly IAppSettings _settings;

    public LlmProviderFactory(IEnumerable<ILlmProvider> providers, IAppSettings settings)
    {
        _byKind = providers.ToDictionary(p => p.Kind);
        _settings = settings;
    }

    public async Task<ILlmProvider> GetCurrentAsync(CancellationToken ct)
    {
        await _settings.LoadAsync(ct);
        var kind = Parse(_settings.LlmProvider);
        return _byKind.TryGetValue(kind, out var provider)
            ? provider
            : _byKind[LlmProviderKind.OpenAiCompatible];
    }

    private static LlmProviderKind Parse(string value) => (value ?? string.Empty).ToLowerInvariant() switch
    {
        "anthropic" => LlmProviderKind.Anthropic,
        "ollama_native" or "ollama" => LlmProviderKind.OllamaNative,
        _ => LlmProviderKind.OpenAiCompatible,
    };
}

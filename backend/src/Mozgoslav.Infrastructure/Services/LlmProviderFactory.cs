using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// BC-036 routes runtime LLM calls to the provider whose
/// <see cref="ILlmProvider.Kind"/> matches <see cref="IAppSettings.LlmProvider"/>.
/// Unknown / empty values fall back to <see cref="DefaultKind"/> with a WARN.
/// </summary>
public sealed class LlmProviderFactory : ILlmProviderFactory
{
    public const string DefaultKind = "openai_compatible";

    private readonly IReadOnlyDictionary<string, ILlmProvider> _providersByKind;
    private readonly IAppSettings _settings;
    private readonly ILogger<LlmProviderFactory> _logger;

    public LlmProviderFactory(
        IEnumerable<ILlmProvider> providers,
        IAppSettings settings,
        ILogger<LlmProviderFactory> logger)
    {
        _providersByKind = providers.ToDictionary(p => p.Kind, StringComparer.OrdinalIgnoreCase);
        _settings = settings;
        _logger = logger;
    }

    public Task<ILlmProvider> GetCurrentAsync(CancellationToken ct)
    {
        var kind = _settings.LlmProvider;

        if (string.IsNullOrWhiteSpace(kind))
        {
            return Task.FromResult(GetDefaultOrThrow());
        }

        if (_providersByKind.TryGetValue(kind, out var provider))
        {
            return Task.FromResult(provider);
        }

        _logger.LogWarning(
            "Unknown LlmProvider setting '{Kind}' — falling back to default '{Default}'",
            kind, DefaultKind);
        return Task.FromResult(GetDefaultOrThrow());
    }

    private ILlmProvider GetDefaultOrThrow()
    {
        if (_providersByKind.TryGetValue(DefaultKind, out var def))
        {
            return def;
        }
        throw new InvalidOperationException(
            $"No LLM provider with Kind='{DefaultKind}' is registered; the composition root must register at least the OpenAI-compatible provider.");
    }
}

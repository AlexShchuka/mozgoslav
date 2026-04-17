using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// High-level transcript-processing service (<see cref="ILlmService"/>). Selects
/// the current <see cref="ILlmProvider"/> via <see cref="ILlmProviderFactory"/>
/// and defers chunk/merge/parse to <see cref="LlmChunker"/>. The class name
/// stays for DI compatibility; the actual transport can be any provider per
/// ADR-006 D-14.
/// </summary>
public sealed class OpenAiCompatibleLlmService : ILlmService
{
    private readonly ILlmProviderFactory _factory;
    private readonly IAppSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpenAiCompatibleLlmService> _logger;

    public OpenAiCompatibleLlmService(
        ILlmProviderFactory factory,
        IAppSettings settings,
        IHttpClientFactory httpClientFactory,
        ILogger<OpenAiCompatibleLlmService> logger)
    {
        _factory = factory;
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("llm");
            client.Timeout = TimeSpan.FromSeconds(3);
            using var response = await client.GetAsync(new Uri(new Uri(_settings.LlmEndpoint), "/v1/models"), ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "LLM availability check failed");
            return false;
        }
    }

    public async Task<LlmProcessingResult> ProcessAsync(string transcript, string systemPrompt, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(systemPrompt);
        if (string.IsNullOrWhiteSpace(transcript))
        {
            return LlmChunker.Empty;
        }

        var provider = await _factory.GetCurrentAsync(ct);
        var merged = LlmChunker.Empty;
        foreach (var chunk in LlmChunker.Chunk(transcript))
        {
            var raw = await provider.ChatAsync(systemPrompt, chunk, ct);
            merged = LlmChunker.Merge(merged, LlmChunker.ParseOrRepair(raw));
        }
        return merged;
    }
}

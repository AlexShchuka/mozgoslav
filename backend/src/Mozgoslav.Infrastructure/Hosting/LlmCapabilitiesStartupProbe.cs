using System;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;

namespace Mozgoslav.Infrastructure.Hosting;

public sealed class LlmCapabilitiesStartupProbe : IHostedService
{
    private readonly ILlmCapabilitiesProbe _probe;
    private readonly ILlmCapabilitiesCache _cache;
    private readonly IAppSettings _settings;
    private readonly ILogger<LlmCapabilitiesStartupProbe> _logger;

    public LlmCapabilitiesStartupProbe(
        ILlmCapabilitiesProbe probe,
        ILlmCapabilitiesCache cache,
        IAppSettings settings,
        ILogger<LlmCapabilitiesStartupProbe> logger)
    {
        _probe = probe;
        _cache = cache;
        _settings = settings;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var endpoint = _settings.LlmEndpoint;
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            _logger.LogInformation("LLM endpoint not configured — skipping capability probe on startup");
            return;
        }

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(15));

            var capabilities = await _probe.ProbeAsync(
                endpoint,
                _settings.LlmModel,
                _settings.LlmApiKey,
                cts.Token);

            _cache.SetCurrent(capabilities);
            _logger.LogInformation(
                "LLM capabilities cached on startup: toolCalling={ToolCalling} jsonMode={JsonMode}",
                capabilities.SupportsToolCalling,
                capabilities.SupportsJsonMode);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("LLM capability probe timed out on startup");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM capability probe failed on startup — capabilities unknown");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

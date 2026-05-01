using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate.Subscriptions;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;
using Mozgoslav.Application.Monitoring;
using Mozgoslav.Infrastructure.Monitoring;

namespace Mozgoslav.Api.GraphQL.Monitoring;

public sealed class RuntimeStateProvider : IRuntimeStateProvider
{
    private readonly ILlmCapabilitiesCache _capabilitiesCache;
    private readonly ILlmCapabilitiesProbe _capabilitiesProbe;
    private readonly IAppSettings _appSettings;
    private readonly SyncthingDetectionService _syncthingDetection;
    private readonly ITopicEventSender _eventSender;
    private readonly ILogger<RuntimeStateProvider> _logger;
    private volatile IReadOnlyList<SupervisorServiceState> _electronServices = [];
    private readonly Lock _llmStateLock = new();
    private string? _lastLlmError;
    private bool _llmOnline;

    public RuntimeStateProvider(
        ILlmCapabilitiesCache capabilitiesCache,
        ILlmCapabilitiesProbe capabilitiesProbe,
        IAppSettings appSettings,
        SyncthingDetectionService syncthingDetection,
        ITopicEventSender eventSender,
        ILogger<RuntimeStateProvider> logger)
    {
        _capabilitiesCache = capabilitiesCache;
        _capabilitiesProbe = capabilitiesProbe;
        _appSettings = appSettings;
        _syncthingDetection = syncthingDetection;
        _eventSender = eventSender;
        _logger = logger;
    }

    public Task<RuntimeState> GetCurrentAsync(CancellationToken ct)
    {
        return Task.FromResult(BuildCurrentState());
    }

    public async Task<RuntimeState> ReprobeAsync(CancellationToken ct)
    {
        var endpoint = _appSettings.LlmEndpoint;
        LlmRuntimeState llmState;

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            llmState = BuildOfflineLlmState(string.Empty, "LLM endpoint not configured");
        }
        else
        {
            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(15));

                var capabilities = await _capabilitiesProbe.ProbeAsync(
                    endpoint,
                    _appSettings.LlmModel,
                    _appSettings.LlmApiKey,
                    cts.Token);

                _capabilitiesCache.SetCurrent(capabilities);

                bool wasOffline;
                lock (_llmStateLock)
                {
                    wasOffline = !_llmOnline;
                    _llmOnline = true;
                    _lastLlmError = null;
                }

                if (wasOffline)
                {
                    _logger.LogInformation("LLM endpoint back online: {Endpoint}", endpoint);
                }

                llmState = BuildOnlineLlmState(endpoint, capabilities);
            }
            catch (OperationCanceledException)
            {
                bool wasOnline;
                lock (_llmStateLock)
                {
                    wasOnline = _llmOnline;
                    _llmOnline = false;
                    _lastLlmError = "Probe timed out";
                }

                if (wasOnline)
                {
                    _logger.LogWarning("LLM offline at {Endpoint}: probe timed out", endpoint);
                }

                llmState = BuildOfflineLlmState(endpoint, "Probe timed out");
            }
            catch (Exception ex)
            {
                bool wasOnline;
                lock (_llmStateLock)
                {
                    wasOnline = _llmOnline;
                    _llmOnline = false;
                    _lastLlmError = ex.Message;
                }

                if (wasOnline)
                {
                    _logger.LogWarning("LLM offline at {Endpoint}: {Error}", endpoint, ex.Message);
                }

                llmState = BuildOfflineLlmState(endpoint, ex.Message);
            }
        }

        var syncthingState = _syncthingDetection.Detect();
        var state = new RuntimeState(llmState, syncthingState, _electronServices);

        await _eventSender.SendAsync(MonitoringTopics.RuntimeStateChanged, state, ct);

        return state;
    }

    public async Task UpdateElectronServicesAsync(IReadOnlyList<SupervisorServiceState> services, CancellationToken ct)
    {
        _electronServices = services;
        var state = BuildCurrentState();
        await _eventSender.SendAsync(MonitoringTopics.RuntimeStateChanged, state, ct);
    }

    private RuntimeState BuildCurrentState()
    {
        var endpoint = _appSettings.LlmEndpoint ?? string.Empty;
        var capabilities = _capabilitiesCache.TryGetCurrent();

        string? lastError;
        lock (_llmStateLock)
        {
            lastError = _lastLlmError;
        }

        var llmState = capabilities is not null
            ? BuildOnlineLlmState(endpoint, capabilities)
            : new LlmRuntimeState(
                Endpoint: endpoint,
                Online: false,
                LastProbedAt: DateTime.MinValue,
                Model: _appSettings.LlmModel ?? string.Empty,
                ContextLength: 0,
                SupportsToolCalling: false,
                SupportsJsonMode: false,
                LastError: lastError);

        var syncthingState = _syncthingDetection.Detect();
        return new RuntimeState(llmState, syncthingState, _electronServices);
    }

    private LlmRuntimeState BuildOnlineLlmState(string endpoint, LlmCapabilities capabilities)
    {
        return new LlmRuntimeState(
            Endpoint: endpoint,
            Online: true,
            LastProbedAt: capabilities.ProbedAt.UtcDateTime,
            Model: _appSettings.LlmModel ?? string.Empty,
            ContextLength: capabilities.CtxLength,
            SupportsToolCalling: capabilities.SupportsToolCalling,
            SupportsJsonMode: capabilities.SupportsJsonMode,
            LastError: null);
    }

    private static LlmRuntimeState BuildOfflineLlmState(string endpoint, string error)
    {
        return new LlmRuntimeState(
            Endpoint: endpoint,
            Online: false,
            LastProbedAt: DateTime.MinValue,
            Model: string.Empty,
            ContextLength: 0,
            SupportsToolCalling: false,
            SupportsJsonMode: false,
            LastError: error);
    }
}

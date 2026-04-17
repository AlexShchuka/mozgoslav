using System.Net;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Typed HTTP client wrapper over Syncthing's REST API (ADR-003 D3).
/// Injected through <see cref="ISyncthingClient"/>. The base address, api-key
/// and port are taken from the currently-running Syncthing instance managed by
/// Electron; the Electron main process hands them to the backend via the
/// <c>IAppSettings</c> snapshot once the lifecycle service has started.
/// </summary>
public sealed class SyncthingHttpClient : ISyncthingClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private const int EventsPollTimeoutSeconds = 60;

    private readonly HttpClient _http;
    private readonly ILogger<SyncthingHttpClient> _logger;

    public SyncthingHttpClient(HttpClient http, ILogger<SyncthingHttpClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct)
    {
        try
        {
            using var response = await _http.GetAsync("/rest/system/status", ct);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogDebug(ex, "Syncthing healthcheck failed (assumed offline)");
            return false;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return false;
        }
    }

    public async Task<string> GetLocalDeviceIdAsync(CancellationToken ct)
    {
        using var response = await _http.GetAsync("/rest/system/status", ct);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<SystemStatusDto>(JsonOptions, ct);
        return payload?.MyID ?? throw new InvalidOperationException(
            "Syncthing /rest/system/status returned no myID field");
    }

    public async Task<SyncStatusSnapshot> GetStatusAsync(CancellationToken ct)
    {
        var foldersTask = FetchAndParseFoldersAsync(ct);
        var devicesTask = FetchAndParseDevicesAsync(ct);

        var folders = await foldersTask;
        var devices = await devicesTask;
        return new SyncStatusSnapshot(folders, devices);
    }

    public async IAsyncEnumerable<SyncthingEvent> StreamEventsAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        long lastSeen = 0;
        while (!ct.IsCancellationRequested)
        {
            List<SyncthingEvent>? batch = null;
            try
            {
                var url = $"/rest/events?since={lastSeen}&timeout={EventsPollTimeoutSeconds}";
                using var response = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
                response.EnsureSuccessStatusCode();
                var payload = await response.Content.ReadAsStringAsync(ct);
                batch = [.. SyncthingSseEventParser.ParseBatch(payload)];
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                yield break;
            }
            catch (HttpRequestException ex)
            {
                // Syncthing restart, transient TCP reset, etc. — back off and retry.
                _logger.LogDebug(ex, "Syncthing event poll failed; retrying in 2 s");
                await SafeDelay(TimeSpan.FromSeconds(2), ct);
                continue;
            }

            if (batch is { Count: > 0 })
            {
                foreach (var evt in batch)
                {
                    if (evt.Id > lastSeen)
                    {
                        lastSeen = evt.Id;
                    }
                    yield return evt;
                }
            }
        }
    }

    public async Task AcceptPendingDeviceAsync(
        string deviceId,
        string deviceName,
        IReadOnlyList<string> folderIds,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(deviceId);
        ArgumentNullException.ThrowIfNull(folderIds);

        var body = new
        {
            deviceID = deviceId,
            name = deviceName,
            autoAcceptFolders = true,
            sharedFolders = folderIds,
        };

        using var response = await _http.PostAsJsonAsync(
            $"/rest/cluster/pending/devices?device={Uri.EscapeDataString(deviceId)}",
            body,
            JsonOptions,
            ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task ShutdownAsync(CancellationToken ct)
    {
        using var response = await _http.PostAsync("/rest/system/shutdown", content: null, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<string> GetConfigAsync(CancellationToken ct)
    {
        using var response = await _http.GetAsync("/rest/system/config", ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }

    public async Task ReplaceConfigAsync(string configJson, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(configJson);
        using var content = new StringContent(configJson, Encoding.UTF8, "application/json");
        using var response = await _http.PutAsync("/rest/system/config", content, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<IReadOnlyDictionary<string, FolderVersioning>> GetFolderVersioningsAsync(
        CancellationToken ct)
    {
        using var response = await _http.GetAsync("/rest/config/folders", ct);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return new Dictionary<string, FolderVersioning>();
        }
        response.EnsureSuccessStatusCode();
        var folders = await response.Content
            .ReadFromJsonAsync<IReadOnlyList<FolderWithVersioningDto>>(JsonOptions, ct) ?? [];

        return folders.ToDictionary(
            f => f.Id,
            f => new FolderVersioning(
                f.Versioning?.Type ?? "none",
                f.Versioning?.Params ?? new Dictionary<string, string>()));
    }

    private async Task<IReadOnlyList<SyncFolderStatus>> FetchAndParseFoldersAsync(CancellationToken ct)
    {
        using var configResponse = await _http.GetAsync("/rest/config/folders", ct);
        if (configResponse.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }
        configResponse.EnsureSuccessStatusCode();
        var foldersConfig = await configResponse.Content
            .ReadFromJsonAsync<IReadOnlyList<FolderConfigDto>>(JsonOptions, ct) ?? [];

        var results = new List<SyncFolderStatus>(foldersConfig.Count);
        foreach (var folder in foldersConfig)
        {
            using var statusResponse = await _http.GetAsync(
                $"/rest/db/status?folder={Uri.EscapeDataString(folder.Id)}", ct);
            if (!statusResponse.IsSuccessStatusCode)
            {
                results.Add(new SyncFolderStatus(folder.Id, "error", 0, 0));
                continue;
            }
            var status = await statusResponse.Content
                .ReadFromJsonAsync<DbStatusDto>(JsonOptions, ct) ?? new DbStatusDto();

            var global = status.GlobalBytes == 0 ? 0 : (double)status.NeedBytes / status.GlobalBytes;
            var completion = Math.Round((1.0 - global) * 100.0, 1);
            results.Add(new SyncFolderStatus(
                Id: folder.Id,
                State: status.State ?? "unknown",
                CompletionPct: completion,
                // Conflicts aren't surfaced by /rest/db/status; the SSE parser
                // side-channels them via SyncthingEvent.FileConflict.
                Conflicts: 0));
        }
        return results;
    }

    private async Task<IReadOnlyList<SyncDeviceStatus>> FetchAndParseDevicesAsync(CancellationToken ct)
    {
        using var response = await _http.GetAsync("/rest/system/connections", ct);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }
        response.EnsureSuccessStatusCode();
        var connections = await response.Content
            .ReadFromJsonAsync<SystemConnectionsDto>(JsonOptions, ct) ?? new SystemConnectionsDto();

        return connections.Connections
            .Select(kv => new SyncDeviceStatus(
                Id: kv.Key,
                Name: kv.Value.ClientVersion ?? kv.Key,
                Connected: kv.Value.Connected,
                LastSeen: kv.Value.ConnectedAt ?? kv.Value.StartedAt))
            .ToArray();
    }

    private static async Task SafeDelay(TimeSpan delay, CancellationToken ct)
    {
        try { await Task.Delay(delay, ct); }
        catch (TaskCanceledException) { }
    }

    private sealed record SystemStatusDto(string MyID);

    private sealed record FolderConfigDto(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("label")] string? Label);

    private sealed record FolderWithVersioningDto(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("versioning")] FolderVersioningDto? Versioning);

    private sealed record FolderVersioningDto(
        [property: JsonPropertyName("type")] string? Type,
        [property: JsonPropertyName("params")] IReadOnlyDictionary<string, string>? Params);

    private sealed class DbStatusDto
    {
        public string? State { get; init; }
        public long GlobalBytes { get; init; }
        public long NeedBytes { get; init; }
    }

    private sealed class SystemConnectionsDto
    {
        public IDictionary<string, ConnectionDto> Connections { get; init; } =
            new Dictionary<string, ConnectionDto>();
    }

    private sealed class ConnectionDto
    {
        public bool Connected { get; init; }
        public string? ClientVersion { get; init; }
        public DateTimeOffset? ConnectedAt { get; init; }
        public DateTimeOffset? StartedAt { get; init; }
    }
}

using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Plan v0.8 Block 6 — HTTP client for the Obsidian Local REST API plugin.
/// Uses the <c>Mozgoslav.Obsidian</c> named <see cref="HttpClient"/> so the
/// composition root can attach a localhost-scoped certificate validation
/// callback for the plugin's self-signed certificate.
/// <para>
/// Every method uses <see cref="IAppSettings.ObsidianApiHost"/> +
/// <see cref="IAppSettings.ObsidianApiToken"/> resolved from the DB at call
/// time so the user can change the host/token in Settings without a backend
/// restart. An empty token short-circuits to "unreachable" so the client
/// never bangs the REST surface with invalid credentials.
/// </para>
/// </summary>
public sealed class ObsidianRestApiClient : IObsidianRestClient
{
    public const string HttpClientName = "Mozgoslav.Obsidian";
    private static readonly TimeSpan ProbeTimeout = TimeSpan.FromMilliseconds(500);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppSettings _settings;
    private readonly ILogger<ObsidianRestApiClient> _logger;

    public ObsidianRestApiClient(
        IHttpClientFactory httpClientFactory,
        IAppSettings settings,
        ILogger<ObsidianRestApiClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _logger = logger;
    }

    public async Task<bool> IsReachableAsync(CancellationToken ct)
    {
        var host = _settings.ObsidianApiHost;
        var token = _settings.ObsidianApiToken;
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            using var client = BuildClient(host, token, ProbeTimeout);
            using var response = await client.GetAsync(new Uri(host.TrimEnd('/') + "/"), ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            _logger.LogDebug(ex, "Obsidian REST probe failed");
            return false;
        }
    }

    public async Task OpenNoteAsync(string vaultRelativePath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultRelativePath);
        var (host, token) = RequireCredentials();
        using var client = BuildClient(host, token, timeout: null);
        var uri = new Uri(host.TrimEnd('/') + "/open/" + Uri.EscapeDataString(vaultRelativePath));
        using var response = await client.PostAsync(uri, content: null, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<ObsidianVaultInfo> GetVaultInfoAsync(CancellationToken ct)
    {
        var (host, token) = RequireCredentials();
        using var client = BuildClient(host, token, timeout: null);
        var uri = new Uri(host.TrimEnd('/') + "/");
        using var response = await client.GetAsync(uri, ct);
        response.EnsureSuccessStatusCode();
        var envelope = await response.Content.ReadFromJsonAsync<InfoDto>(ct);
        return new ObsidianVaultInfo(
            Name: envelope?.Service ?? "obsidian",
            Path: envelope?.VaultPath ?? string.Empty,
            Version: envelope?.VersionValue ?? "unknown");
    }

    public async Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultRelativePath);
        var (host, token) = RequireCredentials();
        using var client = BuildClient(host, token, timeout: null);
        var path = vaultRelativePath.TrimEnd('/') + "/";
        var uri = new Uri(host.TrimEnd('/') + "/vault/" + path);
        using var response = await client.PutAsync(uri, content: null, ct);
        if ((int)response.StatusCode >= 400 && response.StatusCode != HttpStatusCode.Conflict)
        {
            response.EnsureSuccessStatusCode();
        }
    }

    private (string Host, string Token) RequireCredentials()
    {
        var host = _settings.ObsidianApiHost;
        var token = _settings.ObsidianApiToken;
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException(
                "Obsidian REST API is not configured. Fill in host + token in Settings, " +
                "or call IObsidianRestClient.IsReachableAsync() first and fall back to file-I/O.");
        }
        return (host, token);
    }

    private HttpClient BuildClient(string host, string token, TimeSpan? timeout)
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        client.BaseAddress ??= new Uri(host);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (timeout.HasValue)
        {
            client.Timeout = timeout.Value;
        }
        return client;
    }

    private sealed record InfoDto(
        [property: JsonPropertyName("service")] string? Service,
        [property: JsonPropertyName("versions")] VersionDto? Versions,
        [property: JsonPropertyName("manifest")] ManifestDto? Manifest,
        [property: JsonPropertyName("vaultPath")] string? VaultPath)
    {
        [JsonIgnore]
        public string? VersionValue => Manifest?.Version ?? Versions?.Plugin;
    }

    private sealed record VersionDto(
        [property: JsonPropertyName("plugin")] string? Plugin,
        [property: JsonPropertyName("obsidian")] string? Obsidian);

    private sealed record ManifestDto(
        [property: JsonPropertyName("version")] string? Version);
}

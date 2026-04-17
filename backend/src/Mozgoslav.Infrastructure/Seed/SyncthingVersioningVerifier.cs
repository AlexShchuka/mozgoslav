using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Infrastructure.Seed;

/// <summary>
/// ADR-004 R8 runtime check: once Syncthing is reachable, confirm each managed
/// folder's versioning policy matches what <see cref="SyncthingConfigService"/>
/// wrote on first boot. Any drift (type or key params) is logged as a warning;
/// we don't auto-repair because a user may have intentionally relaxed the
/// policy via the Syncthing UI.
/// </summary>
public sealed class SyncthingVersioningVerifier : BackgroundService
{
    private static readonly IReadOnlyDictionary<string, ExpectedPolicy> Expected =
        new Dictionary<string, ExpectedPolicy>
        {
            [SyncthingConfigService.RecordingsFolderId] = new("staggered", "maxAge"),
            [SyncthingConfigService.NotesFolderId] = new("trashcan", "cleanoutDays"),
            [SyncthingConfigService.VaultFolderId] = new("trashcan", "cleanoutDays"),
        };

    private readonly ISyncthingClient _client;
    private readonly ILogger<SyncthingVersioningVerifier> _logger;

    public SyncthingVersioningVerifier(
        ISyncthingClient client,
        ILogger<SyncthingVersioningVerifier> logger)
    {
        _client = client;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // ADR-007 bug 6 — when Syncthing is not configured, the DI container
        // hands us the DisabledSyncthingClient. Do not spin a periodic health
        // probe against a feature that is intentionally off; Phase 2 Backend
        // MR D rewires this once the lifecycle service actually spawns the
        // bundled binary.
        if (_client is DisabledSyncthingClient)
        {
            _logger.LogInformation("Syncthing disabled — skipping versioning verifier");
            return;
        }

        while (!stoppingToken.IsCancellationRequested && !await _client.IsHealthyAsync(stoppingToken))
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
        if (stoppingToken.IsCancellationRequested) return;

        try
        {
            var actual = await _client.GetFolderVersioningsAsync(stoppingToken);
            foreach (var (folderId, policy) in Expected)
            {
                if (!actual.TryGetValue(folderId, out var got))
                {
                    _logger.LogInformation(
                        "Syncthing folder {FolderId} not present yet — skipping R8 check",
                        folderId);
                    continue;
                }
                if (!string.Equals(got.Type, policy.Type, StringComparison.OrdinalIgnoreCase)
                    || !got.Params.ContainsKey(policy.RequiredParamKey))
                {
                    _logger.LogWarning(
                        "Syncthing folder {FolderId} versioning drifted: expected type={Expected} with param '{Key}', got type={Actual}",
                        folderId, policy.Type, policy.RequiredParamKey, got.Type);
                }
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogDebug(ex, "Skipping Syncthing R8 check — client not reachable");
        }
    }

    private sealed record ExpectedPolicy(string Type, string RequiredParamKey);
}

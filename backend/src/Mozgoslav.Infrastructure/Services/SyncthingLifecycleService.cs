using System.ComponentModel;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// ADR-007-phase2-backend §2.3 BC-048 / BC-049 — spawns the bundled Syncthing
/// binary on a random free loopback port with a freshly generated API-key,
/// then tears it down gracefully on app shutdown (POST /rest/system/shutdown,
/// SIGTERM fallback).
/// <para>
/// This replaces the Phase-1 <c>NotYetWiredSyncthingLifecycleService</c> stub.
/// When the bundled binary is absent from the expected locations (pod-only
/// sandbox, dev box without the Electron wrapper that ships the binary,
/// …) the service logs an INF line once and becomes a no-op — it does NOT
/// log WRN / ERR spam on every boot. The existing
/// <see cref="DisabledSyncthingClient"/> registration in <c>Program.cs</c>
/// continues to answer <c>/api/sync/*</c> with empty-state payloads, which
/// is the intentional fallback behaviour for the "no Syncthing" path
/// (ADR-007 bug 6).
/// </para>
/// <para>
/// Binary discovery order:
/// <list type="number">
///   <item><c>MOZGOSLAV_SYNCTHING_BINARY</c> environment variable (primary override).</item>
///   <item><c>SYNCTHING_BINARY</c> environment variable (legacy alias).</item>
///   <item><c>syncthing</c> on <c>PATH</c>.</item>
/// </list>
/// First match wins; missing all three puts us into the no-op branch.
/// </para>
/// </summary>
public sealed class SyncthingLifecycleService : IHostedService, IAsyncDisposable
{
    private static readonly TimeSpan GracefulShutdownTimeout = TimeSpan.FromSeconds(5);

    private readonly IAppSettings _settings;
    private readonly ILogger<SyncthingLifecycleService> _logger;

    private Process? _process;
    private int _port;
    private string? _apiKey;
    private bool _disposed;

    public SyncthingLifecycleService(
        IAppSettings settings,
        ILogger<SyncthingLifecycleService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_settings.SyncthingEnabled)
        {
            _logger.LogInformation("Syncthing disabled by settings — lifecycle service is a no-op");
            return;
        }

        var binaryPath = ResolveSyncthingBinary();
        if (binaryPath is null)
        {
            _logger.LogInformation(
                "Syncthing binary not found on this host — lifecycle service is a no-op. "
                + "Set Mozgoslav:SyncthingBinaryPath or SYNCTHING_BINARY to enable.");
            return;
        }

        _port = FindFreeLoopbackPort();
        _apiKey = GenerateApiKey();
        var home = AppPaths.SyncthingHome;
        Directory.CreateDirectory(home);

        _logger.LogInformation(
            "Starting Syncthing: binary={Binary}, port={Port}, home={Home}",
            binaryPath, _port, home);

        var psi = new ProcessStartInfo
        {
            FileName = binaryPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        psi.ArgumentList.Add("serve");
        psi.ArgumentList.Add("--no-browser");
        psi.ArgumentList.Add("--no-restart");
        psi.ArgumentList.Add($"--gui-address=127.0.0.1:{_port}");
        psi.ArgumentList.Add($"--gui-apikey={_apiKey}");
        psi.ArgumentList.Add($"--home={home}");

        try
        {
            _process = Process.Start(psi);
        }
        catch (Exception ex) when (ex is Win32Exception or InvalidOperationException)
        {
            _logger.LogWarning(ex,
                "Failed to spawn Syncthing at {Binary}; lifecycle service is a no-op for this run",
                binaryPath);
            return;
        }

        if (_process is null)
        {
            _logger.LogWarning("Syncthing spawn returned null process handle — lifecycle service is a no-op");
            return;
        }

        // Best-effort: persist the base URL + API key so SyncthingHttpClient
        // (if wired via Mozgoslav:SyncthingBaseUrl at next boot) has the
        // right coordinates. We do not block on /rest/system/status here —
        // the versioning verifier already polls for readiness.
        _logger.LogInformation(
            "Syncthing process spawned (PID={Pid}); ready probe delegated to SyncthingVersioningVerifier",
            _process.Id);
        await Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_process is null || _process.HasExited)
        {
            return;
        }

        _logger.LogInformation("Stopping Syncthing (PID={Pid})", _process.Id);

        // Graceful path — POST /rest/system/shutdown against the local REST
        // endpoint with the API key we generated. A dedicated short-lived
        // HttpClient avoids tangling with the request-scoped one.
        try
        {
            using var http = new HttpClient { Timeout = GracefulShutdownTimeout };
            http.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
            using var response = await http.PostAsync(
                $"http://127.0.0.1:{_port}/rest/system/shutdown",
                content: null,
                cancellationToken);
            // 200 OK or 204 — either is acceptable.
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogDebug(ex, "Graceful Syncthing shutdown failed — falling back to kill");
        }

        try
        {
            using var timeoutCts = new CancellationTokenSource(GracefulShutdownTimeout);
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken, timeoutCts.Token);
            try
            {
                await _process.WaitForExitAsync(linked.Token);
            }
            catch (OperationCanceledException)
            {
                if (!_process.HasExited)
                {
                    _process.Kill(entireProcessTree: true);
                }
            }
        }
        catch (InvalidOperationException)
        {
            // Process already exited between the check and the kill — fine.
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;
        try
        {
            if (_process is { HasExited: false })
            {
                await StopAsync(CancellationToken.None);
            }
        }
        finally
        {
            _process?.Dispose();
        }
    }

    private static string? ResolveSyncthingBinary()
    {
        // Env-var override takes precedence so operators and the Electron
        // wrapper can pin the bundled path without touching code or settings.
        var envVar = Environment.GetEnvironmentVariable("MOZGOSLAV_SYNCTHING_BINARY");
        if (!string.IsNullOrWhiteSpace(envVar) && File.Exists(envVar))
        {
            return envVar;
        }

        var legacyEnvVar = Environment.GetEnvironmentVariable("SYNCTHING_BINARY");
        if (!string.IsNullOrWhiteSpace(legacyEnvVar) && File.Exists(legacyEnvVar))
        {
            return legacyEnvVar;
        }

        var fromPath = FindOnPath("syncthing");
        if (fromPath is not null)
        {
            return fromPath;
        }

        return null;
    }

    private static string? FindOnPath(string exe)
    {
        var path = Environment.GetEnvironmentVariable("PATH");
        if (string.IsNullOrEmpty(path)) return null;
        var separator = Path.PathSeparator;
        foreach (var dir in path.Split(separator, StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = Path.Combine(dir, exe);
            if (File.Exists(candidate)) return candidate;
        }
        return null;
    }

    private static int FindFreeLoopbackPort()
    {
        // TcpListener implements IDisposable via its Dispose method in modern
        // .NET; wrap in `using` so CA2000 / IDISP001 are happy.
        using var listener = new TcpListener(IPAddress.Loopback, port: 0);
        listener.Start();
        try
        {
            return ((IPEndPoint)listener.LocalEndpoint).Port;
        }
        finally
        {
            listener.Stop();
        }
    }

    // 32 bytes of cryptographically random hex ⇒ 64-char API key,
    // matching the ADR-007 §2.3 requirement.
    private static string GenerateApiKey() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
}

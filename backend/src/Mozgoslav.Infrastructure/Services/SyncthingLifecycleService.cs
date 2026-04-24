using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

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

        try
        {
            using var http = new HttpClient { Timeout = GracefulShutdownTimeout };
            http.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
            using var response = await http.PostAsync(
                $"http://127.0.0.1:{_port}/rest/system/shutdown",
                content: null,
                cancellationToken);
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

    private static string GenerateApiKey() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
}

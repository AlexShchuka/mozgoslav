using System;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Prompts;

public sealed class PromptDispatcher
{
    private readonly IAppSettings _settings;
    private readonly ILogger<PromptDispatcher> _logger;

    public PromptDispatcher(IAppSettings settings, ILogger<PromptDispatcher> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task DispatchAsync(string prompt, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(prompt);

        var cliPath = _settings.ClaudeCliPath;
        if (!string.IsNullOrWhiteSpace(cliPath))
        {
            await DispatchToCliAsync(prompt, cliPath, ct);
        }
        else
        {
            await CopyToClipboardAsync(prompt, ct);
        }
    }

    private async Task DispatchToCliAsync(string prompt, string cliPath, CancellationToken ct)
    {
        try
        {
            var sanitized = prompt.Replace("\"", "\\\"", StringComparison.Ordinal);
            var info = new ProcessStartInfo(cliPath, $"-p \"{sanitized}\"")
            {
                UseShellExecute = false,
                RedirectStandardOutput = false,
            };
            using var process = Process.Start(info);
            if (process is not null)
            {
                await process.WaitForExitAsync(ct);
                _logger.LogInformation("claude cli exited with code {Code}", process.ExitCode);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "claude cli dispatch failed, falling back to clipboard");
            await CopyToClipboardAsync(prompt, ct);
        }
    }

    private async Task CopyToClipboardAsync(string prompt, CancellationToken ct)
    {
        if (OperatingSystem.IsMacOS())
        {
            await CopyViaPbcopyAsync(prompt, ct);
        }
        else
        {
            _logger.LogInformation(
                "Clipboard dispatch not supported on this platform; prompt length={Len}",
                prompt.Length);
        }
    }

    private static async Task CopyViaPbcopyAsync(string text, CancellationToken ct)
    {
        var info = new ProcessStartInfo("pbcopy")
        {
            UseShellExecute = false,
            RedirectStandardInput = true,
        };
        using var process = Process.Start(info);
        if (process is null)
        {
            return;
        }
        var encoded = Encoding.UTF8.GetBytes(text);
        await process.StandardInput.BaseStream.WriteAsync(encoded, ct);
        process.StandardInput.Close();
        await process.WaitForExitAsync(ct);
    }
}

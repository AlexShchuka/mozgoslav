using System;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Native.V1;

namespace Mozgoslav.Infrastructure.Platform;

public sealed class GrpcNativeHelperClient : INativeHelperClient
{
    private readonly DictationHelper.DictationHelperClient _client;
    private readonly ILogger<GrpcNativeHelperClient> _logger;

    public GrpcNativeHelperClient(
        DictationHelper.DictationHelperClient client,
        ILogger<GrpcNativeHelperClient> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<SystemActionResult> RunShortcutAsync(
        string name,
        string input,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        try
        {
            var request = new RunShortcutRequest
            {
                Name = name,
                Input = input ?? string.Empty,
            };

            var reply = await _client.RunShortcutAsync(request, cancellationToken: ct);

            return new SystemActionResult(
                Success: reply.Success,
                Output: reply.Stdout.Length > 0 ? reply.Stdout : null,
                Error: reply.Stderr.Length > 0 ? reply.Stderr : null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex,
                "RunShortcut gRPC call failed for shortcut {Name}", name);
            return new SystemActionResult(
                Success: false,
                Output: null,
                Error: ex.Message);
        }
    }
}

using System;
using System.ComponentModel;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class DictationMcpTools
{
    private readonly IDictationSessionManager _manager;

    public DictationMcpTools(IDictationSessionManager manager)
    {
        _manager = manager;
    }

    [McpServerTool(Name = "dictation.start")]
    [Description("Start a new dictation session. Returns the session id.")]
    public DictationStartResult Start()
    {
        var session = _manager.Start(source: "mcp");
        return new DictationStartResult(session.Id.ToString());
    }

    [McpServerTool(Name = "dictation.stop")]
    [Description("Stop an active dictation session and finalize the transcript.")]
    public async Task<DictationStopResult> StopAsync(
        [Description("The session id returned by dictation.start")] string sessionId,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(sessionId, out var guid))
        {
            return new DictationStopResult(false, string.Empty, "invalid session id");
        }
        try
        {
            var final = await _manager.StopAsync(guid, cancellationToken);
            return new DictationStopResult(true, final.PolishedText, null);
        }
        catch (Exception ex)
        {
            return new DictationStopResult(false, string.Empty, ex.Message);
        }
    }

    [McpServerTool(Name = "dictation.cancel")]
    [Description("Cancel an active dictation session without producing a transcript.")]
    public async Task<DictationCancelResult> CancelAsync(
        [Description("The session id returned by dictation.start")] string sessionId,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(sessionId, out var guid))
        {
            return new DictationCancelResult(false, "invalid session id");
        }
        try
        {
            await _manager.CancelAsync(guid, cancellationToken);
            return new DictationCancelResult(true, null);
        }
        catch (Exception ex)
        {
            return new DictationCancelResult(false, ex.Message);
        }
    }
}

public sealed record DictationStartResult(string SessionId);
public sealed record DictationStopResult(bool Success, string Transcript, string? Error);
public sealed record DictationCancelResult(bool Success, string? Error);

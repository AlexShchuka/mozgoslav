using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Microsoft.Extensions.Logging;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Dictation;

[ExtendObjectType(typeof(MutationType))]
public sealed class DictationMutationType
{
    public async Task<DictationStartPayload> DictationStart(
        string? source,
        Guid? recordingId,
        [Service] IDictationSessionManager manager,
        [Service] ITopicEventSender sender,
        [Service] ILogger<DictationMutationType> logger,
        CancellationToken ct)
    {
        try
        {
            var kind = recordingId.HasValue ? DictationSessionKind.Longform : DictationSessionKind.Dictation;
            var session = manager.Start(source, kind, recordingId);
            if (kind == DictationSessionKind.Dictation)
            {
                _ = ForwardPartialsAsync(session.Id, manager, sender, logger, ct);
            }
            return new DictationStartPayload(session.Id, session.Source, []);
        }
        catch (InvalidOperationException ex)
        {
            return new DictationStartPayload(null, null, [new ConflictError("CONFLICT", ex.Message)]);
        }
    }

    public async Task<DictationStopPayload> DictationStop(
        Guid sessionId,
        string? bundleId,
        [Service] IDictationSessionManager manager,
        CancellationToken ct)
    {
        try
        {
            var result = await manager.StopAsync(sessionId, ct, bundleId);
            return new DictationStopPayload(
                result.RawText,
                result.PolishedText,
                result.Duration.TotalMilliseconds,
                []);
        }
        catch (KeyNotFoundException ex)
        {
            return new DictationStopPayload(null, null, null, [new NotFoundError("NOT_FOUND", ex.Message, "DictationSession", sessionId.ToString())]);
        }
    }

    public async Task<DictationCancelPayload> DictationCancel(
        Guid sessionId,
        [Service] IDictationSessionManager manager,
        CancellationToken ct)
    {
        await manager.CancelAsync(sessionId, ct);
        return new DictationCancelPayload([]);
    }

    private static async Task ForwardPartialsAsync(
        Guid sessionId,
        IDictationSessionManager manager,
        ITopicEventSender sender,
        ILogger logger,
        CancellationToken ct)
    {
        try
        {
            await foreach (var partial in manager.SubscribePartialsAsync(sessionId, ct))
            {
                var evt = new DictationPartialEvent(sessionId, partial.Text, partial.Timestamp.TotalMilliseconds);
                try
                {
                    await sender.SendAsync(DictationTopics.ForSession(sessionId), evt, ct);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Failed to forward dictation partial for session {SessionId}", sessionId);
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Dictation partial forwarding terminated for session {SessionId}", sessionId);
        }
    }
}

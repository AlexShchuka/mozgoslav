using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Api.Endpoints;

public static class DictationEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public sealed record PushChunkRequest(
        IReadOnlyList<float> Samples,
        int SampleRate,
        double OffsetSeconds);

    public static IEndpointRouteBuilder MapDictationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/dictation/start", (IDictationSessionManager manager) =>
        {
            try
            {
                var session = manager.Start();
                return Results.Ok(new { sessionId = session.Id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        });

        endpoints.MapPost("/api/dictation/push/{sessionId:guid}", async (
            Guid sessionId,
            [FromBody] PushChunkRequest request,
            IDictationSessionManager manager,
            CancellationToken ct) =>
        {
            if (request is null || request.Samples is null || request.Samples.Count == 0)
            {
                return Results.BadRequest(new { error = "samples is required" });
            }

            try
            {
                var chunk = new AudioChunk(
                    Samples: [.. request.Samples],
                    SampleRate: request.SampleRate,
                    Offset: TimeSpan.FromSeconds(request.OffsetSeconds));
                await manager.PushAudioAsync(sessionId, chunk, ct);
                return Results.Ok(new { accepted = true });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapGet("/api/dictation/stream/{sessionId:guid}", async (
            Guid sessionId,
            HttpContext context,
            IDictationSessionManager manager,
            CancellationToken ct) =>
        {
            if (manager.TryGet(sessionId) is null)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsync($"session {sessionId} not found", ct);
                return;
            }

            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers["X-Accel-Buffering"] = "no";

            await context.Response.WriteAsync(":ok\n\n", ct);
            await context.Response.Body.FlushAsync(ct);

            await foreach (var partial in manager.SubscribePartialsAsync(sessionId, ct))
            {
                var payload = JsonSerializer.Serialize(new
                {
                    text = partial.Text,
                    timestampMs = partial.Timestamp.TotalMilliseconds,
                }, JsonOptions);

                await context.Response.WriteAsync($"event: partial\ndata: {payload}\n\n", Encoding.UTF8, ct);
                await context.Response.Body.FlushAsync(ct);
            }
        });

        endpoints.MapPost("/api/dictation/stop/{sessionId:guid}", async (
            Guid sessionId,
            IDictationSessionManager manager,
            CancellationToken ct) =>
        {
            try
            {
                var result = await manager.StopAsync(sessionId, ct);
                return Results.Ok(new
                {
                    rawText = result.RawText,
                    polishedText = result.PolishedText,
                    durationMs = result.Duration.TotalMilliseconds,
                });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        endpoints.MapPost("/api/dictation/cancel/{sessionId:guid}", async (
            Guid sessionId,
            IDictationSessionManager manager,
            CancellationToken ct) =>
        {
            await manager.CancelAsync(sessionId, ct);
            return Results.Ok(new { cancelled = true });
        });

        return endpoints;
    }
}

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
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public sealed record PushChunkRequest(
        IReadOnlyList<float> Samples,
        int SampleRate,
        double OffsetSeconds);

    /// <summary>
    /// TODO-1 — optional body forwarded to <see cref="IDictationSessionManager.Start"/>.
    /// <c>source</c> tags the origin ("mouse5" | "dashboard" | "global-hotkey"),
    /// <c>profileId</c> is reserved for the follow-up profile-threading slice.
    /// Both fields are optional — legacy callers that send no body continue to
    /// work unchanged.
    /// </summary>
    public sealed record StartSessionRequest(string? Source, string? ProfileId);

    /// <summary>
    /// ADR-004 R2 — optional finalize payload. When the Electron main process
    /// knows which app currently owns keyboard focus it forwards the macOS
    /// bundle identifier here so the session manager can apply a per-app
    /// correction profile to the polished transcript.
    /// </summary>
    public sealed record StopSessionRequest(string? BundleId);

    public static IEndpointRouteBuilder MapDictationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/dictation/start", (
            [FromBody] StartSessionRequest? body,
            IDictationSessionManager manager) =>
        {
            try
            {
                var session = manager.Start(source: body?.Source);
                return Results.Ok(new { sessionId = session.Id, source = session.Source });
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

        // ADR-007 BC-004 / Phase 2 frontend coordination — Dashboard record button.
        // The browser's MediaRecorder ships Opus-in-WebM chunks at
        // `POST /api/dictation/{sessionId}/push` with Content-Type
        // `application/octet-stream` (or `audio/webm;codecs=opus`). The handler
        // decodes to 16 kHz float32 mono PCM via ffmpeg and feeds the session
        // manager the same way the JSON `samples[]` path does. When the body
        // looks like raw PCM (legacy tests / Electron native path) we skip the
        // decode step.
        endpoints.MapPost("/api/dictation/{sessionId:guid}/push", async (
            Guid sessionId,
            HttpContext context,
            IDictationSessionManager manager,
            IAudioPcmDecoder decoder,
            CancellationToken ct) =>
        {
            using var memoryStream = new MemoryStream();
            await context.Request.Body.CopyToAsync(memoryStream, ct);
            var payload = memoryStream.ToArray();
            if (payload.Length == 0)
            {
                return Results.BadRequest(new { error = "empty audio payload" });
            }

            try
            {
                var samples = LooksLikeRawPcm(context.Request.ContentType, payload)
                    ? BytesToFloat32Le(payload)
                    : await decoder.DecodeToPcmAsync(payload, ct);

                if (samples.Length == 0)
                {
                    // Harmless — MediaRecorder may emit a handful of header-only chunks at start.
                    return Results.Ok(new { accepted = true, samples = 0 });
                }

                var chunk = new AudioChunk(
                    Samples: samples,
                    SampleRate: decoder.TargetSampleRate,
                    Offset: TimeSpan.Zero);
                await manager.PushAudioAsync(sessionId, chunk, ct);
                return Results.Ok(new { accepted = true, samples = samples.Length });
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
                    timestampMs = partial.Timestamp.TotalMilliseconds
                }, JsonOptions);

                await context.Response.WriteAsync($"event: partial\ndata: {payload}\n\n", Encoding.UTF8, ct);
                await context.Response.Body.FlushAsync(ct);
            }
        });

        endpoints.MapPost("/api/dictation/stop/{sessionId:guid}", async (
            Guid sessionId,
            [FromBody] StopSessionRequest? body,
            IDictationSessionManager manager,
            CancellationToken ct) =>
        {
            try
            {
                var result = await manager.StopAsync(sessionId, ct, body?.BundleId);
                return Results.Ok(new
                {
                    rawText = result.RawText,
                    polishedText = result.PolishedText,
                    durationMs = result.Duration.TotalMilliseconds
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

    /// <summary>
    /// Best-effort detection of a raw float32-LE PCM payload vs an encoded
    /// container (WebM / Ogg / etc.). The native Electron dictation flow may
    /// also hit this endpoint in the future; until then any non-PCM body is
    /// routed through ffmpeg.
    /// </summary>
    private static bool LooksLikeRawPcm(string? contentType, byte[] payload)
    {
        if (!string.IsNullOrWhiteSpace(contentType)
            && contentType.StartsWith("audio/pcm", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // WebM starts with EBML magic (0x1A 0x45 0xDF 0xA3).
        if (payload.Length >= 4
            && payload[0] == 0x1A && payload[1] == 0x45
            && payload[2] == 0xDF && payload[3] == 0xA3)
        {
            return false;
        }
        // Ogg starts with "OggS".
        if (payload.Length >= 4
            && payload[0] == 0x4F && payload[1] == 0x67
            && payload[2] == 0x67 && payload[3] == 0x53)
        {
            return false;
        }

        // Default when `Content-Type: audio/pcm` is NOT set: treat as encoded.
        // Raw-PCM callers should opt in explicitly via Content-Type so we don't
        // misinterpret a malformed encoded payload as noise samples.
        return false;
    }

    private static float[] BytesToFloat32Le(byte[] payload)
    {
        if (payload.Length % sizeof(float) != 0)
        {
            throw new InvalidOperationException(
                $"raw PCM payload must be a multiple of {sizeof(float)} bytes; got {payload.Length}");
        }
        var samples = new float[payload.Length / sizeof(float)];
        Buffer.BlockCopy(payload, 0, samples, 0, payload.Length);
        return samples;
    }
}

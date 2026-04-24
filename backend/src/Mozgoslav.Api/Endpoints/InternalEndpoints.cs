using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Api.Endpoints;

public static class InternalEndpoints
{
    public sealed record PushChunkRequest(
        IReadOnlyList<float> Samples,
        int SampleRate,
        double OffsetSeconds);

    public static IEndpointRouteBuilder MapInternalEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/_internal/devices/changed", async (
            [FromBody] AudioDeviceChangePayload payload,
            IAudioDeviceChangeNotifier notifier,
            CancellationToken ct) =>
        {
            if (payload is null)
            {
                return Results.BadRequest(new { error = "payload required" });
            }
            await notifier.PublishAsync(payload, ct);
            return Results.Ok(new { accepted = true });
        });

        endpoints.MapPost("/_internal/hotkey/event", async (
            [FromBody] HotkeyEvent payload,
            IHotkeyEventNotifier notifier,
            CancellationToken ct) =>
        {
            if (payload is null)
            {
                return Results.BadRequest(new { error = "payload required" });
            }
            if (payload.Kind != "press" && payload.Kind != "release")
            {
                return Results.BadRequest(new { error = "kind must be press or release" });
            }
            await notifier.PublishAsync(payload, ct);
            return Results.Ok(new { accepted = true });
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

        endpoints.MapPost("/api/dictation/{sessionId:guid}/push", async (
            Guid sessionId,
            HttpContext context,
            IDictationSessionManager manager,
            IDictationPcmStream pcmStream,
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
                if (LooksLikeRawPcm(context.Request.ContentType, payload))
                {
                    var samples = BytesToFloat32Le(payload);
                    if (samples.Length == 0)
                    {
                        return Results.Ok(new { accepted = true, samples = 0 });
                    }
                    var chunk = new AudioChunk(
                        Samples: samples,
                        SampleRate: pcmStream.TargetSampleRate,
                        Offset: TimeSpan.Zero);
                    await manager.PushAudioAsync(sessionId, chunk, ct);
                    return Results.Ok(new { accepted = true, samples = samples.Length });
                }

                await manager.PushRawChunkAsync(sessionId, payload, ct);
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

        return endpoints;
    }

    private static bool LooksLikeRawPcm(string? contentType, byte[] payload)
    {
        if (!string.IsNullOrWhiteSpace(contentType)
            && contentType.StartsWith("audio/pcm", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (payload.Length >= 4
            && payload[0] == 0x1A && payload[1] == 0x45
            && payload[2] == 0xDF && payload[3] == 0xA3)
        {
            return false;
        }
        if (payload.Length >= 4
            && payload[0] == 0x4F && payload[1] == 0x67
            && payload[2] == 0x67 && payload[3] == 0x53)
        {
            return false;
        }

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

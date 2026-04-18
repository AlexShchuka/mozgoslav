using System.Runtime.CompilerServices;

using Microsoft.AspNetCore.Mvc;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

public static class SseEndpoints
{
    public static IEndpointRouteBuilder MapSseEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // ADR-011 step 7 — the SSE wire framing is owned by the framework's
        // TypedResults.ServerSentEvents (.NET 10) helper. Endpoint hands the
        // framework an IAsyncEnumerable of payload records; it handles
        // keep-alives, `data: …`, `event: …`, and retry tokens.
        endpoints.MapGet("/api/jobs/stream", (
            IJobProgressNotifier notifier,
            CancellationToken ct) =>
        {
            return TypedResults.ServerSentEvents(
                ProjectAsync(notifier, ct),
                eventType: "job");
        });

        // D3 — hot-plug microphone notifications. Inbound POST from the Swift
        // helper (via the Electron loopback bridge) carries the fresh device
        // list; outbound SSE re-emits it to the renderer so the Dashboard can
        // toast + re-enable Start when a mic is swapped mid-session.
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

        endpoints.MapGet("/api/devices/stream", (
            IAudioDeviceChangeNotifier notifier,
            CancellationToken ct) =>
        {
            return TypedResults.ServerSentEvents(
                notifier.SubscribeAsync(ct),
                eventType: "device-changed");
        });

        return endpoints;
    }

    private static async IAsyncEnumerable<JobSsePayload> ProjectAsync(
        IJobProgressNotifier notifier,
        [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var job in notifier.SubscribeAsync(ct))
        {
            yield return new JobSsePayload(
                job.Id,
                job.RecordingId,
                job.ProfileId,
                job.Status.ToString(),
                job.Progress,
                job.CurrentStep,
                job.ErrorMessage,
                job.StartedAt,
                job.FinishedAt);
        }
    }

    private sealed record JobSsePayload(
        Guid Id,
        Guid RecordingId,
        Guid ProfileId,
        string Status,
        int Progress,
        string? CurrentStep,
        string? ErrorMessage,
        DateTime? StartedAt,
        DateTime? FinishedAt);
}

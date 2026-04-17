using System.Runtime.CompilerServices;

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

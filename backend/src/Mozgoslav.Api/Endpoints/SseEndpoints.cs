using System.Text;
using System.Text.Json;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

public static class SseEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IEndpointRouteBuilder MapSseEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/jobs/stream", async (
            HttpContext context,
            IJobProgressNotifier notifier,
            CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers["X-Accel-Buffering"] = "no"; // disable proxy buffering

            await context.Response.WriteAsync(":ok\n\n", ct);
            await context.Response.Body.FlushAsync(ct);

            await foreach (var job in notifier.SubscribeAsync(ct))
            {
                var payload = JsonSerializer.Serialize(new
                {
                    job.Id,
                    job.RecordingId,
                    job.ProfileId,
                    status = job.Status.ToString(),
                    job.Progress,
                    job.CurrentStep,
                    job.ErrorMessage,
                    job.StartedAt,
                    job.FinishedAt
                }, JsonOptions);

                await context.Response.WriteAsync($"event: job\ndata: {payload}\n\n", Encoding.UTF8, ct);
                await context.Response.Body.FlushAsync(ct);
            }
        });

        return endpoints;
    }
}

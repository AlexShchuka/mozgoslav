using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

public static class QueueEndpoints
{
    public static IEndpointRouteBuilder MapQueueEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapDelete("/api/queue/{id:guid}", async (
            Guid id,
            IProcessingJobRepository repository,
            CancellationToken ct) =>
        {
            var cancelled = await repository.CancelQueuedAsync(id, ct);
            return cancelled
                ? Results.NoContent()
                : Results.Conflict(new { error = "job is not in Queued state or does not exist" });
        });

        return endpoints;
    }
}

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
            // ADR-006 D-9: queued jobs are removed; in-flight jobs are marked
            // Failed with "Cancelled by user" so the record stays around for
            // history and the worker surfaces termination naturally.
            var outcome = await repository.CancelAsync(id, ct);
            return outcome switch
            {
                CancelJobResult.NotFound => Results.NotFound(),
                CancelJobResult.RemovedFromQueue => Results.NoContent(),
                CancelJobResult.MarkedFailed => Results.Ok(new { status = "cancelled", markedFailed = true }),
                CancelJobResult.AlreadyTerminal => Results.Conflict(new { error = "Job already finished." }),
                _ => Results.StatusCode(500)
            };
        });

        return endpoints;
    }
}

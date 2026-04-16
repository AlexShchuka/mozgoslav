using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.Endpoints;

public static class JobEndpoints
{
    public sealed record CreateJobRequest(Guid RecordingId, Guid ProfileId);

    public static IEndpointRouteBuilder MapJobEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/jobs", async (
            IProcessingJobRepository repository,
            CancellationToken ct) =>
        {
            var jobs = await repository.GetAllAsync(ct);
            return Results.Ok(jobs);
        });

        endpoints.MapGet("/api/jobs/active", async (
            IProcessingJobRepository repository,
            CancellationToken ct) =>
        {
            var jobs = await repository.GetActiveAsync(ct);
            return Results.Ok(jobs);
        });

        endpoints.MapPost("/api/jobs", async (
            CreateJobRequest request,
            IProcessingJobRepository jobs,
            IProfileRepository profiles,
            IRecordingRepository recordings,
            CancellationToken ct) =>
        {
            var recording = await recordings.GetByIdAsync(request.RecordingId, ct);
            if (recording is null)
            {
                return Results.BadRequest(new { error = "Recording not found" });
            }

            var profile = await profiles.GetByIdAsync(request.ProfileId, ct);
            if (profile is null)
            {
                return Results.BadRequest(new { error = "Profile not found" });
            }

            var job = new ProcessingJob
            {
                RecordingId = request.RecordingId,
                ProfileId = request.ProfileId,
                Status = JobStatus.Queued
            };
            await jobs.EnqueueAsync(job, ct);
            return Results.Created($"/api/jobs/{job.Id}", job);
        });

        return endpoints;
    }
}

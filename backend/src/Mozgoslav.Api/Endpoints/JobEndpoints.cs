using System;
using System.Threading;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

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
            IProcessingJobScheduler scheduler,
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
            await scheduler.ScheduleAsync(job.Id, ct);
            return Results.Created($"/api/jobs/{job.Id}", job);
        });

        endpoints.MapPost("/api/jobs/{id:guid}/cancel", async (
            Guid id,
            IProcessingJobRepository jobs,
            IJobCancellationRegistry registry,
            IJobProgressNotifier notifier,
            CancellationToken ct) =>
        {
            var job = await jobs.GetByIdAsync(id, ct);
            if (job is null)
            {
                return Results.NotFound();
            }

            if (job.Status is JobStatus.Done or JobStatus.Failed or JobStatus.Cancelled)
            {
                return Results.Conflict(new { error = "job already in terminal state" });
            }

            if (job.Status == JobStatus.Queued)
            {
                job.Status = JobStatus.Cancelled;
                job.FinishedAt = DateTime.UtcNow;
                job.CancelRequested = true;
                await jobs.UpdateAsync(job, ct);
                await notifier.PublishAsync(job, ct);
                return Results.NoContent();
            }

            await jobs.SetCancelRequestedAsync(id, ct);
            registry.TryCancel(id);
            return Results.Accepted();
        });

        return endpoints;
    }
}

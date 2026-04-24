using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Jobs;

[ExtendObjectType(typeof(MutationType))]
public sealed class JobMutationType
{
    public async Task<JobPayload> EnqueueJob(
        EnqueueJobInput input,
        [Service] IProcessingJobRepository jobs,
        [Service] IRecordingRepository recordings,
        [Service] IProfileRepository profiles,
        [Service] IProcessingJobScheduler scheduler,
        CancellationToken ct)
    {
        var recording = await recordings.GetByIdAsync(input.RecordingId, ct);
        if (recording is null)
        {
            return new JobPayload(null, [new NotFoundError("NOT_FOUND", "Recording not found", "Recording", input.RecordingId.ToString())]);
        }

        var profile = await profiles.GetByIdAsync(input.ProfileId, ct);
        if (profile is null)
        {
            return new JobPayload(null, [new NotFoundError("NOT_FOUND", "Profile not found", "Profile", input.ProfileId.ToString())]);
        }

        var job = new ProcessingJob
        {
            RecordingId = input.RecordingId,
            ProfileId = input.ProfileId,
            Status = JobStatus.Queued
        };
        await jobs.EnqueueAsync(job, ct);
        await scheduler.ScheduleAsync(job.Id, ct);
        return new JobPayload(job, []);
    }

    public async Task<CancelJobPayload> CancelJob(
        Guid id,
        [Service] IProcessingJobRepository jobs,
        [Service] IJobCancellationRegistry registry,
        [Service] IJobProgressNotifier notifier,
        CancellationToken ct)
    {
        var job = await jobs.GetByIdAsync(id, ct);
        if (job is null)
        {
            return new CancelJobPayload([new NotFoundError("NOT_FOUND", "Job not found", "ProcessingJob", id.ToString())]);
        }

        if (job.Status is JobStatus.Done or JobStatus.Failed or JobStatus.Cancelled)
        {
            return new CancelJobPayload([new ConflictError("CONFLICT", "Job is already in a terminal state")]);
        }

        if (job.Status == JobStatus.Queued)
        {
            job.Status = JobStatus.Cancelled;
            job.FinishedAt = DateTime.UtcNow;
            job.CancelRequested = true;
            await jobs.UpdateAsync(job, ct);
            await notifier.PublishAsync(job, ct);
            return new CancelJobPayload([]);
        }

        await jobs.SetCancelRequestedAsync(id, ct);
        registry.TryCancel(id);
        return new CancelJobPayload([]);
    }
}

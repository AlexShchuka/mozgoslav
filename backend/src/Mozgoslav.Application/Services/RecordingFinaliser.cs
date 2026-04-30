using System;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Application.Services;

public sealed class RecordingFinaliser
{
    public readonly record struct RecordingMetadata(string Sha256, TimeSpan Duration);

    private readonly IProcessingJobRepository _jobs;
    private readonly IProcessingJobScheduler _scheduler;

    public RecordingFinaliser(IProcessingJobRepository jobs, IProcessingJobScheduler scheduler)
    {
        _jobs = jobs;
        _scheduler = scheduler;
    }

    public async Task<RecordingMetadata> ResolveMetadataAsync(
        string filePath,
        IAudioMetadataProbe? probe,
        CancellationToken ct)
    {
        var sha256 = await HashCalculator.Sha256Async(filePath, ct);
        var duration = probe is not null
            ? await probe.GetDurationAsync(filePath, ct)
            : TimeSpan.Zero;
        return new RecordingMetadata(sha256, duration);
    }

    public async Task EnqueueAndScheduleAsync(Guid recordingId, Guid profileId, CancellationToken ct)
    {
        var job = await _jobs.EnqueueAsync(
            new ProcessingJob
            {
                RecordingId = recordingId,
                ProfileId = profileId
            },
            ct);
        await _scheduler.ScheduleAsync(job.Id, ct);
    }
}

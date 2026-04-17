using Mozgoslav.Application.Interfaces;

using Quartz;

namespace Mozgoslav.Infrastructure.Jobs;

/// <summary>
/// ADR-011 step 6 — implementation of <see cref="IProcessingJobScheduler"/>
/// that schedules one-shot Quartz triggers for the <see cref="ProcessRecordingQuartzJob"/>.
/// The trigger fires immediately (StartNow) but Quartz will queue it behind
/// any in-flight trigger because the job is decorated with
/// <c>[DisallowConcurrentExecution]</c>, which replicates the legacy
/// single-worker semantics.
/// </summary>
public sealed class QuartzProcessingJobScheduler : IProcessingJobScheduler
{
    private readonly ISchedulerFactory _schedulerFactory;

    public QuartzProcessingJobScheduler(ISchedulerFactory schedulerFactory)
    {
        _schedulerFactory = schedulerFactory;
    }

    public async Task ScheduleAsync(Guid jobId, CancellationToken ct)
    {
        var scheduler = await _schedulerFactory.GetScheduler(ct).ConfigureAwait(false);
        var jobKey = BuildJobKey(jobId);
        var triggerKey = BuildTriggerKey(jobId);

        var job = JobBuilder.Create<ProcessRecordingQuartzJob>()
            .WithIdentity(jobKey)
            .UsingJobData(ProcessRecordingQuartzJob.JobIdKey, jobId.ToString())
            .RequestRecovery()
            .Build();

        var trigger = TriggerBuilder.Create()
            .WithIdentity(triggerKey)
            .ForJob(jobKey)
            .StartNow()
            .Build();

        // ScheduleJob(detail, trigger, replace=true) handles the re-schedule
        // idempotency — callers can invoke ScheduleAsync for the same job id
        // repeatedly without producing duplicate triggers.
        await scheduler.ScheduleJob(job, [trigger], replace: true, ct).ConfigureAwait(false);
    }

    internal static JobKey BuildJobKey(Guid jobId) =>
        new($"process-recording-{jobId:N}", ProcessRecordingQuartzJob.JobGroup);

    internal static TriggerKey BuildTriggerKey(Guid jobId) =>
        new($"trigger-{jobId:N}", ProcessRecordingQuartzJob.JobGroup);
}

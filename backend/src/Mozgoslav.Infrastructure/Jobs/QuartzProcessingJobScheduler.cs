using System;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

using Quartz;

namespace Mozgoslav.Infrastructure.Jobs;

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

        await scheduler.ScheduleJob(job, [trigger], replace: true, ct).ConfigureAwait(false);
    }

    internal static JobKey BuildJobKey(Guid jobId) =>
        new($"process-recording-{jobId:N}", ProcessRecordingQuartzJob.JobGroup);

    internal static TriggerKey BuildTriggerKey(Guid jobId) =>
        new($"trigger-{jobId:N}", ProcessRecordingQuartzJob.JobGroup);
}

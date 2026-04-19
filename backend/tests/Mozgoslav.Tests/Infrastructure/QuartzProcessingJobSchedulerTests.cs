using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Infrastructure.Jobs;

using Quartz;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// ADR-011 step 6 — QuartzProcessingJobScheduler schedules one-shot triggers
/// that fire the recording pipeline. These tests spin up a RAMJobStore-backed
/// scheduler in-process and assert ScheduleAsync creates the expected
/// job + trigger identities.
/// </summary>
[TestClass]
public sealed class QuartzProcessingJobSchedulerTests
{
    private static JobKey JobKeyFor(Guid jobId) =>
        new($"process-recording-{jobId:N}", ProcessRecordingQuartzJob.JobGroup);

    private static TriggerKey TriggerKeyFor(Guid jobId) =>
        new($"trigger-{jobId:N}", ProcessRecordingQuartzJob.JobGroup);

    [TestMethod]
    public async Task ScheduleAsync_CreatesJobAndTrigger_WithProvidedJobId()
    {
        var jobId = Guid.NewGuid();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddQuartz(q =>
        {
            q.AddJob<ProcessRecordingQuartzJob>(jobConfig => jobConfig
                .StoreDurably()
                .WithIdentity("process-recording-template", ProcessRecordingQuartzJob.JobGroup));
        });

        using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<ISchedulerFactory>();
        var scheduler = await factory.GetScheduler(CancellationToken.None);

        var sut = new QuartzProcessingJobScheduler(factory);

        await sut.ScheduleAsync(jobId, CancellationToken.None);

        var jobKey = JobKeyFor(jobId);
        var triggerKey = TriggerKeyFor(jobId);
        var jobExists = await scheduler.CheckExists(jobKey);
        var triggerExists = await scheduler.CheckExists(triggerKey);

        jobExists.Should().BeTrue();
        triggerExists.Should().BeTrue();

        var detail = await scheduler.GetJobDetail(jobKey);
        detail!.JobDataMap.GetString(ProcessRecordingQuartzJob.JobIdKey)
            .Should().Be(jobId.ToString());
        detail.RequestsRecovery.Should().BeTrue();
    }

    [TestMethod]
    public async Task ScheduleAsync_CalledTwiceForSameId_IsIdempotent()
    {
        var jobId = Guid.NewGuid();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddQuartz(q =>
        {
            q.AddJob<ProcessRecordingQuartzJob>(jobConfig => jobConfig
                .StoreDurably()
                .WithIdentity("process-recording-template", ProcessRecordingQuartzJob.JobGroup));
        });
        using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<ISchedulerFactory>();
        var scheduler = await factory.GetScheduler(CancellationToken.None);

        var sut = new QuartzProcessingJobScheduler(factory);

        await sut.ScheduleAsync(jobId, CancellationToken.None);
        await sut.ScheduleAsync(jobId, CancellationToken.None);

        var triggerKey = TriggerKeyFor(jobId);
        var triggers = await scheduler.GetTriggersOfJob(JobKeyFor(jobId));
        triggers.Should().ContainSingle(t => t.Key.Equals(triggerKey));
    }
}

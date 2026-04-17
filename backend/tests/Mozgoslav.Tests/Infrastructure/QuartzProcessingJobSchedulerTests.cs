using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Jobs;

using NSubstitute;

using Quartz;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// ADR-011 step 6 — QuartzProcessingJobScheduler schedules one-shot triggers
/// that fire the recording pipeline. These tests spin up a RAMJobStore-backed
/// scheduler in-process and assert the trigger actually reaches the
/// <see cref="ProcessRecordingQuartzJob"/> with the correct job id.
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
        services.AddQuartz(q =>
        {
            q.AddJob<ProcessRecordingQuartzJob>(jobConfig => jobConfig
                .StoreDurably()
                .WithIdentity("process-recording-template", ProcessRecordingQuartzJob.JobGroup));
        });
        var worker = Substitute.For<ProcessQueueWorker>(
            Substitute.For<IProcessingJobRepository>(),
            Substitute.For<IRecordingRepository>(),
            Substitute.For<ITranscriptRepository>(),
            Substitute.For<IProcessedNoteRepository>(),
            Substitute.For<IProfileRepository>(),
            Substitute.For<IAudioConverter>(),
            Substitute.For<ITranscriptionService>(),
            Substitute.For<ILlmService>(),
            Substitute.For<IMarkdownExporter>(),
            new Mozgoslav.Application.Services.CorrectionService(),
            Substitute.For<IAppSettings>(),
            Substitute.For<IJobProgressNotifier>(),
            NullLogger<ProcessQueueWorker>.Instance);
        services.AddScoped(_ => worker);

        using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<ISchedulerFactory>();
        var scheduler = await factory.GetScheduler(CancellationToken.None);
        await scheduler.Start(CancellationToken.None);

        try
        {
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
        finally
        {
            await scheduler.Shutdown(waitForJobsToComplete: false, CancellationToken.None);
        }
    }

    [TestMethod]
    public async Task ScheduleAsync_CalledTwiceForSameId_IsIdempotent()
    {
        var jobId = Guid.NewGuid();
        var services = new ServiceCollection();
        services.AddQuartz();
        using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<ISchedulerFactory>();
        var scheduler = await factory.GetScheduler(CancellationToken.None);
        await scheduler.Start(CancellationToken.None);

        try
        {
            var sut = new QuartzProcessingJobScheduler(factory);

            await sut.ScheduleAsync(jobId, CancellationToken.None);
            await sut.ScheduleAsync(jobId, CancellationToken.None);

            var triggerKey = TriggerKeyFor(jobId);
            var triggers = await scheduler.GetTriggersOfJob(JobKeyFor(jobId));
            triggers.Should().ContainSingle(t => t.Key.Equals(triggerKey));
        }
        finally
        {
            await scheduler.Shutdown(waitForJobsToComplete: false, CancellationToken.None);
        }
    }
}

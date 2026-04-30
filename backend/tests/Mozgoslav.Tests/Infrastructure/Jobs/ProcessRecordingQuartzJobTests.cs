using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Jobs;

using NSubstitute;

using Quartz;

namespace Mozgoslav.Tests.Infrastructure.Jobs;

[TestClass]
public sealed class ProcessRecordingQuartzJobTests
{
    private static IJobExecutionContext MakeContext(Guid? jobId, CancellationToken ct = default)
    {
        var ctx = Substitute.For<IJobExecutionContext>();
        ctx.CancellationToken.Returns(ct);
        var dataMap = new JobDataMap();
        if (jobId.HasValue)
        {
            dataMap[ProcessRecordingQuartzJob.JobIdKey] = jobId.Value.ToString();
        }
        ctx.MergedJobDataMap.Returns(dataMap);
        return ctx;
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;

        public IProcessingJobRepository Jobs { get; } = Substitute.For<IProcessingJobRepository>();

        public Fixture()
        {
            Jobs.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
                .Returns((Mozgoslav.Domain.Entities.ProcessingJob?)null);

            var stages = Substitute.For<IProcessingJobStageRepository>();
            stages.GetByJobIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
                .Returns(Array.Empty<Mozgoslav.Domain.Entities.ProcessingJobStage>());

            var settings = Substitute.For<IAppSettings>();
            settings.VaultPath.Returns("/tmp/test");

            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton(Jobs);
            services.AddSingleton(stages);
            services.AddSingleton(settings);
            services.AddSingleton(Substitute.For<IRecordingRepository>());
            services.AddSingleton(Substitute.For<ITranscriptRepository>());
            services.AddSingleton(Substitute.For<IProcessedNoteRepository>());
            services.AddSingleton(Substitute.For<IProfileRepository>());
            services.AddSingleton(Substitute.For<IAudioConverter>());
            services.AddSingleton(Substitute.For<ITranscriptionService>());
            services.AddSingleton(Substitute.For<ILlmService>());
            services.AddSingleton(Substitute.For<ILlmProviderFactory>());
            services.AddSingleton(Substitute.For<IJobProgressNotifier>());
            services.AddSingleton(Substitute.For<IDomainEventBus>());
            services.AddSingleton(Substitute.For<IPythonSidecarClient>());
            services.AddSingleton<IJobCancellationRegistry, JobCancellationRegistry>();
            services.AddSingleton<GlossaryApplicator>();
            services.AddSingleton<CorrectionService>();
            services.AddSingleton<LlmCorrectionService>();
            services.AddScoped<ProcessQueueWorker>();
            _provider = services.BuildServiceProvider();
        }

        public ProcessRecordingQuartzJob BuildJob()
        {
            return new ProcessRecordingQuartzJob(
                _provider.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<ProcessRecordingQuartzJob>.Instance);
        }

        public async ValueTask DisposeAsync()
        {
            await _provider.DisposeAsync();
        }
    }

    [TestMethod]
    public async Task Execute_NullContext_ThrowsArgumentNullException()
    {
        await using var fixture = new Fixture();
        var job = fixture.BuildJob();

        var act = async () => await job.Execute(null!);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task Execute_MissingJobIdKey_ThrowsKeyNotFoundException_NoJobLookup()
    {
        await using var fixture = new Fixture();
        var ctx = MakeContext(jobId: null);
        var job = fixture.BuildJob();

        var act = async () => await job.Execute(ctx);

        await act.Should().ThrowAsync<System.Collections.Generic.KeyNotFoundException>();
        await fixture.Jobs.DidNotReceiveWithAnyArgs().GetByIdAsync(default, default);
    }

    [TestMethod]
    public async Task Execute_ValidJobIdButJobNotFound_CompletesGracefully()
    {
        await using var fixture = new Fixture();
        var jobId = Guid.NewGuid();
        fixture.Jobs.GetByIdAsync(jobId, Arg.Any<CancellationToken>())
            .Returns((Mozgoslav.Domain.Entities.ProcessingJob?)null);

        var ctx = MakeContext(jobId);
        var job = fixture.BuildJob();

        var act = async () => await job.Execute(ctx);

        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task Execute_ValidJobId_DelegatesToProcessQueueWorker()
    {
        await using var fixture = new Fixture();
        var jobId = Guid.NewGuid();

        var ctx = MakeContext(jobId);
        var job = fixture.BuildJob();

        await job.Execute(ctx);

        await fixture.Jobs.Received(1).GetByIdAsync(jobId, Arg.Any<CancellationToken>());
    }
}

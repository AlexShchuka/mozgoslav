using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class JobCancelEndpointsTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Cancel_QueuedJob_Returns204_AndTransitionsToCancelled()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var jobId = await SeedJobAsync(factory, JobStatus.Queued);

        using var response = await client.PostAsync(
            $"/api/jobs/{jobId}/cancel", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var reloaded = await client.GetAsync("/api/jobs", TestContext.CancellationToken);
        var jobs = await reloaded.Content.ReadFromJsonAsync<List<ProcessingJob>>(Json, TestContext.CancellationToken);
        var cancelled = jobs!.Single(j => j.Id == jobId);
        cancelled.Status.Should().Be(JobStatus.Cancelled);
        cancelled.FinishedAt.Should().NotBeNull();
    }

    [TestMethod]
    public async Task Cancel_ActiveJob_Returns202_AndFlipsCancelRequestedFlag()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var jobId = await SeedJobAsync(factory, JobStatus.Transcribing);

        using var response = await client.PostAsync(
            $"/api/jobs/{jobId}/cancel", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        using var scope = factory.Services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProcessingJobRepository>();
        var reloaded = (await repo.GetAllAsync(TestContext.CancellationToken)).Single(j => j.Id == jobId);
        reloaded.CancelRequested.Should().BeTrue();
        reloaded.Status.Should().Be(JobStatus.Transcribing);
    }

    [TestMethod]
    public async Task Cancel_TerminalJob_Returns409_Conflict()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        foreach (var terminal in new[] { JobStatus.Done, JobStatus.Failed, JobStatus.Cancelled })
        {
            var jobId = await SeedJobAsync(factory, terminal);

            using var response = await client.PostAsync(
                $"/api/jobs/{jobId}/cancel", content: null, TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Conflict, $"terminal={terminal}");
        }
    }

    [TestMethod]
    public async Task Cancel_UnknownId_Returns404_NotFound()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync(
            $"/api/jobs/{Guid.NewGuid()}/cancel", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<Guid> SeedJobAsync(ApiFactory factory, JobStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProcessingJobRepository>();
        var job = new ProcessingJob
        {
            Id = Guid.NewGuid(),
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = status,
            FinishedAt = status is JobStatus.Done or JobStatus.Failed or JobStatus.Cancelled
                ? DateTime.UtcNow
                : null
        };
        await repo.EnqueueAsync(job, TestContext.CancellationToken);
        return job.Id;
    }

    public required TestContext TestContext { get; set; }
}

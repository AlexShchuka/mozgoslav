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
public sealed class JobCancelEndpointsTests : IntegrationTestsBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Cancel_QueuedJob_Returns204_AndTransitionsToCancelled()
    {
        using var client = CreateClient();

        var jobId = await SeedJobAsync(JobStatus.Queued);

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
        using var client = CreateClient();

        var jobId = await SeedJobAsync(JobStatus.Transcribing);

        using var response = await client.PostAsync(
            $"/api/jobs/{jobId}/cancel", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        using var scope = Factory.Services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProcessingJobRepository>();
        var reloaded = (await repo.GetAllAsync(TestContext.CancellationToken)).Single(j => j.Id == jobId);
        reloaded.CancelRequested.Should().BeTrue();
        reloaded.Status.Should().Be(JobStatus.Transcribing);
    }

    [TestMethod]
    public async Task Cancel_TerminalJob_Returns409_Conflict()
    {
        using var client = CreateClient();

        foreach (var terminal in new[] { JobStatus.Done, JobStatus.Failed, JobStatus.Cancelled })
        {
            var jobId = await SeedJobAsync(terminal);

            using var response = await client.PostAsync(
                $"/api/jobs/{jobId}/cancel", content: null, TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Conflict, $"terminal={terminal}");
        }
    }

    [TestMethod]
    public async Task Cancel_UnknownId_Returns404_NotFound()
    {
        using var client = CreateClient();

        using var response = await client.PostAsync(
            $"/api/jobs/{Guid.NewGuid()}/cancel", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<Guid> SeedJobAsync(JobStatus status)
    {
        using var scope = Factory.Services.CreateScope();
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
}

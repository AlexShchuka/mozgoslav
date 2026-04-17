using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class ApiEndpointsTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Health_ReturnsOk()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/health", TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        body.Should().Contain("\"status\":\"ok\"");
    }

    [TestMethod]
    public async Task Profiles_Get_ReturnsSeededBuiltInProfiles()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/profiles", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var profiles = await response.Content.ReadFromJsonAsync<List<Profile>>(Json, TestContext.CancellationToken);

        profiles.Should().NotBeNull();
        profiles.Should().HaveCountGreaterThanOrEqualTo(3);
        profiles.Should().ContainSingle(p => p.IsDefault);
        profiles.Where(p => p.IsBuiltIn).Should().HaveCount(3);
    }

    [TestMethod]
    public async Task Profiles_Post_MissingName_ReturnsBadRequest()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/profiles",
            new
            {
                name = "   ",
                systemPrompt = "x",
                cleanupLevel = CleanupLevel.Light,
                isDefault = false
            }, cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Profiles_Post_Valid_CreatesAndListsProfile()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var create = await client.PostAsJsonAsync(
            "/api/profiles",
            new
            {
                name = "Test profile",
                systemPrompt = "test prompt",
                cleanupLevel = CleanupLevel.Light,
                isDefault = false,
                autoTags = new[] { "test" }
            }, cancellationToken: TestContext.CancellationToken);

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<Profile>(Json, TestContext.CancellationToken);
        created!.Name.Should().Be("Test profile");
        created.IsBuiltIn.Should().BeFalse();

        using var fetch = await client.GetAsync($"/api/profiles/{created.Id}", TestContext.CancellationToken);
        fetch.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [TestMethod]
    public async Task Profiles_Get_UnknownId_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync($"/api/profiles/{Guid.NewGuid()}", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Profiles_Delete_UserCreated_ReturnsNoContentAndRemoves()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var create = await client.PostAsJsonAsync(
            "/api/profiles",
            new
            {
                name = "Delete me",
                systemPrompt = "p",
                cleanupLevel = CleanupLevel.Light,
                isDefault = false
            }, cancellationToken: TestContext.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<Profile>(Json, TestContext.CancellationToken);

        using var delete = await client.DeleteAsync($"/api/profiles/{created!.Id}", TestContext.CancellationToken);
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var fetch = await client.GetAsync($"/api/profiles/{created.Id}", TestContext.CancellationToken);
        fetch.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Profiles_Delete_BuiltIn_ReturnsConflict()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var list = await client.GetAsync("/api/profiles", TestContext.CancellationToken);
        var profiles = await list.Content.ReadFromJsonAsync<List<Profile>>(Json, TestContext.CancellationToken);
        var builtIn = profiles!.First(p => p.IsBuiltIn);

        using var delete = await client.DeleteAsync($"/api/profiles/{builtIn.Id}", TestContext.CancellationToken);
        delete.StatusCode.Should().Be(HttpStatusCode.Conflict);

        using var stillThere = await client.GetAsync($"/api/profiles/{builtIn.Id}", TestContext.CancellationToken);
        stillThere.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [TestMethod]
    public async Task Profiles_Delete_UnknownId_ReturnsNotFound()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.DeleteAsync($"/api/profiles/{Guid.NewGuid()}", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Recordings_Get_EmptyList_OnFreshDb()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/recordings", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var recordings = await response.Content.ReadFromJsonAsync<List<Recording>>(Json, TestContext.CancellationToken);
        recordings.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Recordings_Import_EmptyFilePaths_Returns400()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/recordings/import",
            new
            {
                filePaths = Array.Empty<string>()
            }, cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Recordings_Import_MissingFile_Returns400_WithMessage()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/recordings/import",
            new
            {
                filePaths = new[] { "/tmp/mozgoslav-does-not-exist.wav" }
            }, cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        body.Should().Contain("not found");
    }

    [TestMethod]
    public async Task Recordings_Import_ExistingFile_CreatesRecordingAndEnqueuesJob()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"mozgoslav-api-upload-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(tempFile, [1, 2, 3, 4], TestContext.CancellationToken);

        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        try
        {
            using var response = await client.PostAsJsonAsync(
                "/api/recordings/import",
                new
                {
                    filePaths = new[] { tempFile }
                }, cancellationToken: TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var imported = await response.Content.ReadFromJsonAsync<List<Recording>>(Json, TestContext.CancellationToken);
            imported.Should().ContainSingle();
            imported[0].FileName.Should().Be(Path.GetFileName(tempFile));

            using var listResponse = await client.GetAsync("/api/recordings", TestContext.CancellationToken);
            var list = await listResponse.Content.ReadFromJsonAsync<List<Recording>>(Json, TestContext.CancellationToken);
            list.Should().ContainSingle();
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [TestMethod]
    public async Task Jobs_Get_EmptyList_OnFreshDb()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/jobs", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var jobs = await response.Content.ReadFromJsonAsync<List<ProcessingJob>>(Json, TestContext.CancellationToken);
        jobs.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Queue_Delete_QueuedJob_ReturnsNoContentAndRemoves()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var scope = factory.Services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<Mozgoslav.Application.Interfaces.IProcessingJobRepository>();
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Queued
        };
        await repo.EnqueueAsync(job, TestContext.CancellationToken);

        using var response = await client.DeleteAsync($"/api/queue/{job.Id}", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var listResponse = await client.GetAsync("/api/jobs", TestContext.CancellationToken);
        var remaining = await listResponse.Content.ReadFromJsonAsync<List<ProcessingJob>>(Json, TestContext.CancellationToken);
        remaining.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Queue_Delete_InFlightJob_ReturnsOkAndMarksFailed()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var scope = factory.Services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<Mozgoslav.Application.Interfaces.IProcessingJobRepository>();
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Transcribing
        };
        await repo.EnqueueAsync(job, TestContext.CancellationToken);

        using var response = await client.DeleteAsync($"/api/queue/{job.Id}", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var listResponse = await client.GetAsync("/api/jobs", TestContext.CancellationToken);
        var jobs = await listResponse.Content.ReadFromJsonAsync<List<ProcessingJob>>(Json, TestContext.CancellationToken);
        var stored = jobs!.Single(j => j.Id == job.Id);
        stored.Status.Should().Be(JobStatus.Failed);
        stored.ErrorMessage.Should().Be("Cancelled by user");
        stored.FinishedAt.Should().NotBeNull();
    }

    [TestMethod]
    public async Task Queue_Delete_TerminalJob_ReturnsConflict()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var scope = factory.Services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<Mozgoslav.Application.Interfaces.IProcessingJobRepository>();
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Done,
            FinishedAt = DateTime.UtcNow
        };
        await repo.EnqueueAsync(job, TestContext.CancellationToken);

        using var response = await client.DeleteAsync($"/api/queue/{job.Id}", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [TestMethod]
    public async Task Queue_Delete_UnknownId_ReturnsNotFound()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.DeleteAsync($"/api/queue/{Guid.NewGuid()}", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Settings_Get_ReturnsDefaultsOnFreshDb()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/settings", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        body.Should().Contain("llmEndpoint");
    }

    public TestContext TestContext { get; set; }
}

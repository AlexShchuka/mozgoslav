using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

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

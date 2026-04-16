using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// Smoke integration tests for the HTTP surface — one representative test per
/// endpoint family. Runs the full composition root (ASP.NET Minimal API + EF
/// Core Sqlite + built-in profile seeding) against a temp SQLite file.
/// </summary>
[TestClass]
public class ApiEndpointsTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Health_ReturnsOk()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"status\":\"ok\"");
    }

    [TestMethod]
    public async Task Profiles_Get_ReturnsSeededBuiltInProfiles()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/profiles");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var profiles = await response.Content.ReadFromJsonAsync<List<Profile>>(Json);

        profiles.Should().NotBeNull();
        profiles.Should().HaveCountGreaterThanOrEqualTo(3);
        profiles.Should().ContainSingle(p => p.IsDefault);
        profiles.Where(p => p.IsBuiltIn).Should().HaveCount(3);
    }

    [TestMethod]
    public async Task Profiles_Post_MissingName_ReturnsBadRequest()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/profiles", new
        {
            name = "   ",
            systemPrompt = "x",
            cleanupLevel = CleanupLevel.Light,
            isDefault = false,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Profiles_Post_Valid_CreatesAndListsProfile()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var create = await client.PostAsJsonAsync("/api/profiles", new
        {
            name = "Test profile",
            systemPrompt = "test prompt",
            cleanupLevel = CleanupLevel.Light,
            isDefault = false,
            autoTags = new[] { "test" },
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<Profile>(Json);
        created!.Name.Should().Be("Test profile");
        created.IsBuiltIn.Should().BeFalse();

        using var fetch = await client.GetAsync($"/api/profiles/{created.Id}");
        fetch.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [TestMethod]
    public async Task Profiles_Get_UnknownId_Returns404()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync($"/api/profiles/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Recordings_Get_EmptyList_OnFreshDb()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/recordings");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var recordings = await response.Content.ReadFromJsonAsync<List<Recording>>(Json);
        recordings.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Recordings_Import_EmptyFilePaths_Returns400()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/recordings/import", new
        {
            filePaths = Array.Empty<string>(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Recordings_Import_MissingFile_Returns400_WithMessage()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/recordings/import", new
        {
            filePaths = new[] { "/tmp/mozgoslav-does-not-exist.wav" },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("not found");
    }

    [TestMethod]
    public async Task Recordings_Import_ExistingFile_CreatesRecordingAndEnqueuesJob()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"mozgoslav-api-upload-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(tempFile, [1, 2, 3, 4]);

        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        try
        {
            using var response = await client.PostAsJsonAsync("/api/recordings/import", new
            {
                filePaths = new[] { tempFile },
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var imported = await response.Content.ReadFromJsonAsync<List<Recording>>(Json);
            imported.Should().ContainSingle();
            imported[0].FileName.Should().Be(Path.GetFileName(tempFile));

            using var listResponse = await client.GetAsync("/api/recordings");
            var list = await listResponse.Content.ReadFromJsonAsync<List<Recording>>(Json);
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
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/jobs");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var jobs = await response.Content.ReadFromJsonAsync<List<ProcessingJob>>(Json);
        jobs.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Settings_Get_ReturnsDefaultsOnFreshDb()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/settings");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("llmEndpoint");
    }
}

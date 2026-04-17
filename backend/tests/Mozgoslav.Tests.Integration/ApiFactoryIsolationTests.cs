using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// Regression tests for the database-initialization RCA (2026-04-17):
/// <para>
/// <c>Program.cs</c> used to read <c>Mozgoslav:DatabasePath</c> from
/// <c>builder.Configuration</c> before <c>ApiFactory.ConfigureWebHost</c>'s
/// <c>AddInMemoryCollection</c> had been applied. Every integration test host
/// therefore fell back to the relative default <c>"mozgoslav.db"</c> in
/// <c>appsettings.json</c>, so all 32 MSTest workers competed for the same
/// database file: concurrent <c>EnsureCreatedAsync</c> calls raced and
/// produced <c>SqliteException: table "processed_notes" already exists</c>;
/// test data from one method leaked into another.
/// </para>
/// <para>
/// These tests lock in the invariant that every <see cref="ApiFactory"/>
/// instance runs against its own isolated SQLite file and cannot see data
/// written by a concurrent factory.
/// </para>
/// </summary>
[TestClass]
public sealed class ApiFactoryIsolationTests
{
    [TestMethod]
    public async Task TwoFactories_InParallel_UseDisjointDatabases_ForRecordings()
    {
        await using var factoryA = new ApiFactory();
        await using var factoryB = new ApiFactory();

        factoryA.DatabasePath.Should().NotBe(factoryB.DatabasePath);

        using var clientA = factoryA.CreateClient();
        using var clientB = factoryB.CreateClient();

        var tempFile = Path.Combine(Path.GetTempPath(),
            $"mozgoslav-isolation-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(tempFile, [1, 2, 3, 4]);

        try
        {
            // Import a recording into factory A only.
            using var importResponse = await clientA.PostAsJsonAsync(
                "/api/recordings/import",
                new { filePaths = new[] { tempFile } });
            importResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Factory A should see exactly one recording.
            using var listA = await clientA.GetAsync("/api/recordings");
            listA.StatusCode.Should().Be(HttpStatusCode.OK);
            var recordingsA = await listA.Content.ReadFromJsonAsync<List<Recording>>();
            recordingsA.Should().ContainSingle();

            // Factory B must see NO recordings — if cross-contamination
            // returns the databases will be shared and this will fail.
            using var listB = await clientB.GetAsync("/api/recordings");
            listB.StatusCode.Should().Be(HttpStatusCode.OK);
            var recordingsB = await listB.Content.ReadFromJsonAsync<List<Recording>>();
            recordingsB.Should().BeEmpty(
                "parallel ApiFactory instances must not share SQLite databases");
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [TestMethod]
    public async Task Factory_UsesExclusivelyItsOwnDatabaseFile_NotTheRelativeDefault()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        // Hit an endpoint that forces DatabaseInitializer to run.
        using var response = await client.GetAsync("/api/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // The factory's declared DatabasePath must exist on disk...
        File.Exists(factory.DatabasePath).Should().BeTrue(
            "DatabaseInitializer must create the test-owned SQLite file");

        // ...and the old relative default must NOT appear in the CWD.
        var relativeDefault = Path.Combine(Directory.GetCurrentDirectory(), "mozgoslav.db");
        File.Exists(relativeDefault).Should().BeFalse(
            "no integration test may fall through to the relative default path; " +
            $"found stray DB at {relativeDefault}");
    }
}

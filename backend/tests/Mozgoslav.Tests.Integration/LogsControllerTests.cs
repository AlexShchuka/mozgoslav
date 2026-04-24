using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class LogsControllerTests : IntegrationTestsBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestInitialize]
    public void SeedLogDirectory()
    {
        Directory.CreateDirectory(AppPaths.Logs);
        var logPath = Path.Combine(AppPaths.Logs, $"mozgoslav-test-{Guid.NewGuid():N}.log");
        var lines = Enumerable.Range(1, 20).Select(i => $"line-{i}").ToArray();
        File.WriteAllLines(logPath, lines);
        _tempLog = logPath;
    }

    [TestCleanup]
    public void DeleteLogFile()
    {
        if (_tempLog is not null && File.Exists(_tempLog))
        {
            File.Delete(_tempLog);
        }
    }

    private string? _tempLog;

    [TestMethod]
    public async Task List_ReturnsFiles_IncludingFreshlySeededOne()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync("/api/logs", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        body.Should().Contain(Path.GetFileName(_tempLog));
        body.Should().Contain("sizeBytes");
        body.Should().Contain("lastModifiedUtc");
    }

    [TestMethod]
    public async Task Tail_Default_ReturnsLines()
    {
        using var client = CreateClient();

        var fileName = Path.GetFileName(_tempLog!);
        using var response = await client.GetAsync($"/api/logs/tail?file={Uri.EscapeDataString(fileName)}&lines=5", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<TailResponse>(Json, TestContext.CancellationToken);
        payload.Should().NotBeNull();
        payload!.File.Should().Be(fileName);
        payload.Lines.Should().HaveCount(5);
        payload.Lines[^1].Should().Be("line-20");
        payload.TotalLines.Should().Be(20);
    }

    [TestMethod]
    public async Task Tail_LinesOutOfRange_ReturnsBadRequest()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync("/api/logs/tail?lines=0", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Tail_UnknownFile_ReturnsNotFound()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync("/api/logs/tail?file=mozgoslav-missing.log&lines=1", TestContext.CancellationToken);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
    private sealed record TailResponse(string File, IReadOnlyList<string> Lines, int TotalLines);
}

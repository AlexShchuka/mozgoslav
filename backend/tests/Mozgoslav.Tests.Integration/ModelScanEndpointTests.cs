using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007-shared §2.7 BC-033 — filesystem scan endpoint.
/// Contract:
///   GET /api/models/scan?dir=&lt;path&gt;
///     → 200 OK + [{ path, filename, size, kind: "whisper-ggml"|"vad-gguf"|"unknown" }]
///     → 404 Not Found when the directory does not exist.
/// </summary>
[TestClass]
public sealed class ModelScanEndpointTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Scan_NonExistentDir_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var missing = Path.Combine(Path.GetTempPath(), $"mozgoslav-missing-{Guid.NewGuid():N}");
        using var response = await client.GetAsync(
            $"/api/models/scan?dir={Uri.EscapeDataString(missing)}",
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Scan_MissingDirParameter_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/models/scan",
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Scan_ReturnsBinAndGgufFiles_ClassifiesKind()
    {
        var dir = Path.Combine(Path.GetTempPath(), $"mozgoslav-scan-{Guid.NewGuid():N}");
        Directory.CreateDirectory(dir);
        try
        {
            await File.WriteAllBytesAsync(
                Path.Combine(dir, "ggml-large-v3-q8_0.bin"),
                [1, 2, 3, 4],
                TestContext.CancellationToken);
            await File.WriteAllBytesAsync(
                Path.Combine(dir, "ggml-silero-v6.2.0.bin"),
                [5, 6, 7],
                TestContext.CancellationToken);
            await File.WriteAllBytesAsync(
                Path.Combine(dir, "some-custom-model.gguf"),
                [8, 9],
                TestContext.CancellationToken);
            await File.WriteAllBytesAsync(
                Path.Combine(dir, "notes.txt"),
                [0],
                TestContext.CancellationToken);

            await using var factory = new ApiFactory();
            using var client = factory.CreateClient();
            using var response = await client.GetAsync(
                $"/api/models/scan?dir={Uri.EscapeDataString(dir)}",
                TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var payload = await response.Content.ReadFromJsonAsync<List<JsonElement>>(Json, TestContext.CancellationToken);
            payload.Should().NotBeNull();
            payload!.Should().HaveCount(3);

            var kinds = payload.Select(e => e.GetProperty("kind").GetString()).ToList();
            kinds.Should().Contain("whisper-ggml");
            kinds.Should().Contain("vad-gguf");
            kinds.Should().Contain("unknown");

            var whisper = payload.Single(e => e.GetProperty("filename").GetString() == "ggml-large-v3-q8_0.bin");
            whisper.GetProperty("kind").GetString().Should().Be("whisper-ggml");
            whisper.GetProperty("size").GetInt64().Should().Be(4);
        }
        finally
        {
            if (Directory.Exists(dir))
            {
                try { Directory.Delete(dir, recursive: true); } catch { /* best effort */ }
            }
        }
    }

    public TestContext TestContext { get; set; } = null!;
}

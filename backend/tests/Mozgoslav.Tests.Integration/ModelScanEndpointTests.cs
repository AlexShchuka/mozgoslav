using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class ModelScanEndpointTests : IntegrationTestsBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Scan_NonExistentDir_Returns404()
    {
        using var client = CreateClient();

        var missing = Path.Combine(Path.GetTempPath(), $"mozgoslav-missing-{Guid.NewGuid():N}");
        using var response = await client.GetAsync(
            $"/api/models/scan?dir={Uri.EscapeDataString(missing)}",
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Scan_MissingDirParameter_Returns404()
    {
        using var client = CreateClient();

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
            using var client = CreateClient();
            using var response = await client.GetAsync(
                $"/api/models/scan?dir={Uri.EscapeDataString(dir)}",
                TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var payload = await response.Content.ReadFromJsonAsync<List<JsonElement>>(Json, TestContext.CancellationToken);
            payload.Should().NotBeNull();
            payload.Should().HaveCount(3);

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
                try { Directory.Delete(dir, recursive: true); } catch { }
            }
        }
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;

using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007 BC-034 / bugs 1 + 2 — verifies the Whisper default-chain integrity:
/// catalogue entry filename equals AppPaths.DefaultWhisperModelPath filename,
/// short alias `antony66-ggml` resolves to the canonical entry, and the
/// `/api/models/download` async contract returns 202 with a downloadId.
/// </summary>
[TestClass]
public sealed class ModelDefaultChainTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public void AppPathsDefault_MatchesTier1BundleFilename()
    {
        var tier1Stt = ModelCatalog.All.First(e => e.Kind == ModelKind.Stt && e.Tier == ModelTier.Bundle);
        var catalogueFileName = Path.GetFileName(new Uri(tier1Stt.Url).AbsolutePath);
        var defaultPathFileName = Path.GetFileName(AppPaths.DefaultWhisperModelPath);

        defaultPathFileName.Should().Be(catalogueFileName,
            because: "seed path and bundled Tier 1 filename must agree for first-run transcription");
    }

    [TestMethod]
    public void Catalogue_Antony66GgmlAlias_ResolvesToCanonicalEntry()
    {
        var resolved = ModelCatalog.TryGet("antony66-ggml");

        resolved.Should().NotBeNull();
        resolved!.Id.Should().Be("whisper-large-v3-russian-antony66");
        resolved.Kind.Should().Be(ModelKind.Stt);
        resolved.IsDefault.Should().BeTrue();
    }

    [TestMethod]
    public void Catalogue_UnknownId_ReturnsNull()
    {
        ModelCatalog.TryGet("non-existent").Should().BeNull();
    }

    [TestMethod]
    public async Task ModelsDownload_Post_WithAlias_Returns202AndDownloadId()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/models/download",
            new { catalogueId = "antony66-ggml" },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var payload = await response.Content.ReadFromJsonAsync<DownloadAcceptance>(Json, TestContext.CancellationToken);
        payload.Should().NotBeNull();
        payload!.DownloadId.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public async Task ModelsDownload_Post_UnknownId_ReturnsBadRequest()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/models/download",
            new { catalogueId = "not-real" },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task ModelsDownload_Post_MissingId_ReturnsBadRequest()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/models/download",
            new { },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    public TestContext TestContext { get; set; }

    private sealed record DownloadAcceptance(string DownloadId);
}

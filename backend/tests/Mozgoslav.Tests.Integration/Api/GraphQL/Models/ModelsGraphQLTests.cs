using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Models;

[TestClass]
public sealed class ModelsGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task ModelsQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  models { id name description sizeMb kind tier isDefault installed }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["models"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task DownloadModelMutation_UnknownCatalogueId_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  downloadModel(catalogueId: "nonexistent-model-xyz") {
                    downloadId
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["downloadModel"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task DownloadModelMutation_EmptyCatalogueId_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  downloadModel(catalogueId: "") {
                    downloadId
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["downloadModel"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task CancelModelDownloadMutation_UnknownDownloadId_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  cancelModelDownload(downloadId: "ffffffffffffffffffffffffffffffff") {
                    ok
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var ok = json["data"]!["cancelModelDownload"]!["ok"]!.GetValue<bool>();
        ok.Should().BeFalse();
        var errors = json["data"]!["cancelModelDownload"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task CancelModelDownloadMutation_EmptyDownloadId_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  cancelModelDownload(downloadId: "") {
                    ok
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["cancelModelDownload"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task ActiveDownloadsQuery_NoActiveJobs_ReturnsEmptyArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  activeDownloads { id catalogueId state bytesReceived totalBytes }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var arr = json["data"]!["activeDownloads"]!.AsArray();
        arr.Count.Should().Be(0);
    }
}

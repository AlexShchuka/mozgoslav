using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Recordings;

[TestClass]
public sealed class RecordingsGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task RecordingsQuery_ReturnsPagedShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  recordings(first: 5) {
                    totalCount
                    nodes { id fileName status createdAt }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["recordings"]!["totalCount"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task RecordingQuery_NotFound_ReturnsNull()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  recording(id: "00000000-0000-0000-0000-000000000001") {
                    id fileName status
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["recording"].Should().BeNull();
    }

    [TestMethod]
    public async Task ImportRecordingsMutation_EmptyFilePaths_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: ImportRecordingsInput!) {
                  importRecordings(input: $input) {
                    recordings { id }
                    errors { code message }
                  }
                }
                """,
            variables = new { input = new { filePaths = System.Array.Empty<string>() } }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["importRecordings"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task DeleteRecordingMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  deleteRecording(id: "00000000-0000-0000-0000-000000000002") {
                    recording { id }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["deleteRecording"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task ReprocessRecordingMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  reprocessRecording(
                    recordingId: "00000000-0000-0000-0000-000000000003"
                    profileId: "00000000-0000-0000-0000-000000000004"
                  ) {
                    recording { id }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["reprocessRecording"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}

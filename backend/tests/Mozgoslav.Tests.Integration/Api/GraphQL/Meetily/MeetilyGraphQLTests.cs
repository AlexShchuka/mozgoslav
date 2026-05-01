using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Meetily;

[TestClass]
public sealed class MeetilyGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task ImportFromMeetilyMutation_EmptyPath_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  importFromMeetily(meetilyDatabasePath: "") {
                    totalMeetings importedRecordings skippedDuplicates
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var errors = json["data"]!["importFromMeetily"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }

    [TestMethod]
    public async Task ImportFromMeetilyMutation_NonExistentPath_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  importFromMeetily(meetilyDatabasePath: "/nonexistent/path/to/meetily.db") {
                    totalMeetings importedRecordings
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var errors = json["data"]!["importFromMeetily"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}

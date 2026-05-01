using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Rag;

[TestClass]
public sealed class RagGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task RagStatusQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  ragStatus { embeddedNotes chunks }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var status = json["data"]!["ragStatus"];
        status.Should().NotBeNull();
        status!["embeddedNotes"].Should().NotBeNull();
        status["chunks"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task RagQueryQuery_EmptyQuestion_ReturnsNull()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  ragQuery(question: "") {
                    answer llmAvailable
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["ragQuery"].Should().BeNull();
    }

    [TestMethod]
    public async Task RagReindexMutation_EmptyDatabase_ReturnsZeroCounts()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  ragReindex {
                    embeddedNotes chunks errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var payload = json["data"]!["ragReindex"];
        payload.Should().NotBeNull();
        var errors = payload!["errors"]!.AsArray();
        errors.Count.Should().Be(0);
    }
}

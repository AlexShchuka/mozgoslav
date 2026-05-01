using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Search;

[TestClass]
public sealed class SearchGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task UnifiedSearchQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  unifiedSearch(query: "test query", includeWeb: false) {
                    answer
                    citations { source reference snippet }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var payload = json["data"]!["unifiedSearch"];
        payload.Should().NotBeNull();
        payload!["citations"].Should().NotBeNull();
    }
}

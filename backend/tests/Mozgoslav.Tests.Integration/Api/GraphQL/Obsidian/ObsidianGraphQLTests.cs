using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Obsidian;

[TestClass]
public sealed class ObsidianGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task ObsidianDetectQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  obsidianDetect {
                    detected { path name }
                    searched
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var result = json["data"]!["obsidianDetect"];
        result.Should().NotBeNull();
        result!["detected"].Should().NotBeNull();
        result["searched"].Should().NotBeNull();
    }
}

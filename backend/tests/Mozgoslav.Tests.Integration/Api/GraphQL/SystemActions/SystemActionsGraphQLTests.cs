using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.SystemActions;

[TestClass]
public sealed class SystemActionsGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task SystemActionTemplatesQuery_ReturnsArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  systemActionTemplates { name description deeplinkUrl }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["systemActionTemplates"].Should().NotBeNull();
        json["data"]!["systemActionTemplates"]!.AsArray().Should().NotBeNull();
    }
}

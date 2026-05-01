using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Health;

[TestClass]
public sealed class HealthGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task HealthQuery_ReturnsOk()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  health { status time }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["health"]!["status"]!.GetValue<string>().Should().Be("ok");
        json["data"]!["health"]!["time"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task MetaQuery_ReturnsVersionShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  meta { version assemblyVersion commit buildDate }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var meta = json["data"]!["meta"];
        meta.Should().NotBeNull();
        meta!["version"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task LlmHealthQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  llmHealth { available }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["llmHealth"]!["available"].Should().NotBeNull();
    }
}

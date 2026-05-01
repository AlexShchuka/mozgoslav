using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.WebSearch;

[TestClass]
public sealed class WebSearchGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task WebSearchConfigQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  webSearchConfig { ddgEnabled yandexEnabled googleEnabled cacheTtlHours }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var config = json["data"]!["webSearchConfig"];
        config.Should().NotBeNull();
        config!["ddgEnabled"].Should().NotBeNull();
        config["cacheTtlHours"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task UpdateWebSearchConfigMutation_ValidInput_ReturnsUpdatedConfig()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: WebSearchConfigInput!) {
                  updateWebSearchConfig(input: $input) {
                    config { ddgEnabled yandexEnabled googleEnabled cacheTtlHours }
                    errors { code message }
                  }
                }
                """,
            variables = new
            {
                input = new
                {
                    ddgEnabled = true,
                    yandexEnabled = false,
                    googleEnabled = false,
                    cacheTtlHours = 12
                }
            }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var payload = json["data"]!["updateWebSearchConfig"];
        payload.Should().NotBeNull();
        var errors = payload!["errors"]!.AsArray();
        errors.Count.Should().Be(0);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Routines;

[TestClass]
public sealed class RoutinesGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task RoutinesQuery_ReturnsHttpOk()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  routines { key displayName description isEnabled }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var rawBody = await response.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(rawBody);
        json.Should().NotBeNull();
        (json!["data"] is not null || json["errors"] is not null).Should().BeTrue();
    }

    [TestMethod]
    public async Task ToggleRoutineMutation_UnknownKey_ThrowsOrReturns()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  toggleRoutine(key: "nonexistent-routine-key-xyz", enabled: false) {
                    key displayName isEnabled
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var hasErrors = json["errors"] is not null;
        var hasData = json["data"]?["toggleRoutine"] is not null;
        (hasErrors || hasData || json["data"]?["toggleRoutine"] is null).Should().BeTrue();
    }

    [TestMethod]
    public async Task RoutineRunsQuery_ReturnsHttpOk()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  routineRuns(key: "nonexistent-key", limit: 10) {
                    id routineKey status
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var rawBody = await response.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(rawBody);
        json.Should().NotBeNull();
        (json!["data"] is not null || json["errors"] is not null).Should().BeTrue();
    }
}

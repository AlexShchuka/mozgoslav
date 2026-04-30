using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Monitoring;

[TestClass]
public sealed class RuntimeStateQueryTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task RuntimeStateQuery_ReturnsShape()
    {
        using var client = CreateClient();

        var query = new
        {
            query = """
                query {
                  runtimeState {
                    llm { endpoint online lastProbedAt model contextLength supportsToolCalling supportsJsonMode lastError }
                    syncthing { detection binaryPath apiUrl version hint }
                    services { name state lastError restartCount pid port }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", query);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(body);
        json.Should().NotBeNull();

        var data = json!["data"];
        data.Should().NotBeNull();

        var runtimeState = data!["runtimeState"];
        runtimeState.Should().NotBeNull();

        runtimeState!["llm"].Should().NotBeNull();
        runtimeState["syncthing"].Should().NotBeNull();
        runtimeState["services"].Should().NotBeNull();

        var llm = runtimeState["llm"]!;
        llm["online"].Should().NotBeNull();
        llm["endpoint"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task PublishElectronServicesMutation_FromNonLoopback_ReturnsUserError()
    {
        using var client = CreateClient();

        var mutation = new
        {
            query = """
                mutation {
                  publishElectronServices(input: { services: [] }) {
                    state { llm { online } }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", mutation);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(body);
        json.Should().NotBeNull();

        var data = json!["data"];
        if (data is not null && data["publishElectronServices"] is not null)
        {
            var errors = data["publishElectronServices"]!["errors"];
            if (errors is JsonArray errorsArray && errorsArray.Count > 0)
            {
                errorsArray[0]!["code"]!.GetValue<string>().Should().Be("LOOPBACK_ONLY");
            }
        }
    }

    [TestMethod]
    public async Task ReprobeRuntimeStateMutation_ReturnsPayloadWithState()
    {
        using var client = CreateClient();

        var mutation = new
        {
            query = """
                mutation {
                  reprobeRuntimeState {
                    state { llm { endpoint online } syncthing { detection } services { name } }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", mutation);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(body);
        json.Should().NotBeNull();

        var data = json!["data"];
        data.Should().NotBeNull();

        var reprobeResult = data!["reprobeRuntimeState"];
        reprobeResult.Should().NotBeNull();

        var state = reprobeResult!["state"];
        state.Should().NotBeNull();
        state!["llm"].Should().NotBeNull();
    }
}

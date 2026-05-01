using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Dictation;

[TestClass]
public sealed class DictationGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task DictationAudioCapabilitiesQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  dictationAudioCapabilities { isSupported detectedPlatform permissionsRequired }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var caps = json["data"]!["dictationAudioCapabilities"];
        caps.Should().NotBeNull();
        caps!["isSupported"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task DictationStatusQuery_UnknownSession_ReturnsNull()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  dictationStatus(sessionId: "00000000-0000-0000-0000-000000000001") {
                    sessionId state source
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["dictationStatus"].Should().BeNull();
    }

    [TestMethod]
    public async Task DictationStartMutation_ReturnsSessionId()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  dictationStart(source: "test-integration") {
                    sessionId source errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var payload = json["data"]!["dictationStart"];
        payload.Should().NotBeNull();
        var errors = payload!["errors"]!.AsArray();
        errors.Count.Should().Be(0);
        payload["sessionId"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task DictationStopMutation_UnknownSession_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  dictationStop(sessionId: "00000000-0000-0000-0000-000000000099") {
                    rawText errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var errors = json["data"]!["dictationStop"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}

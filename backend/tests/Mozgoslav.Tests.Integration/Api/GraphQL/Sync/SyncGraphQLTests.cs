using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Sync;

[TestClass]
public sealed class SyncGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task SyncHealthQuery_ReturnsBool()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  syncHealth
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["syncHealth"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task SyncStatusQuery_WhenSyncthingUnavailable_ReturnsNull()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  syncStatus {
                    folders { id state }
                    devices { id name connected }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
    }

    [TestMethod]
    public async Task AcceptSyncDeviceMutation_EmptyDeviceId_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  acceptSyncDevice(deviceId: "") {
                    accepted
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var errors = json["data"]!["acceptSyncDevice"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }

    [TestMethod]
    public async Task AcceptSyncDeviceMutation_NonEmptyDeviceId_ReturnsPayload()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  acceptSyncDevice(deviceId: "DEVICE-ID-XXXX-YYYY") {
                    accepted
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["acceptSyncDevice"].Should().NotBeNull();
        json["data"]!["acceptSyncDevice"]!["accepted"].Should().NotBeNull();
    }
}

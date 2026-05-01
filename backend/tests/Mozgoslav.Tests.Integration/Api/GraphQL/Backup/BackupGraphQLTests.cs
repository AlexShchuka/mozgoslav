using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Backup;

[TestClass]
public sealed class BackupGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task BackupsQuery_ReturnsArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  backups { name path sizeBytes createdAt }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["backups"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task CreateBackupMutation_ReturnsPayload()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  createBackup {
                    backup { name path sizeBytes }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var payload = json["data"]!["createBackup"];
        payload.Should().NotBeNull();
    }
}

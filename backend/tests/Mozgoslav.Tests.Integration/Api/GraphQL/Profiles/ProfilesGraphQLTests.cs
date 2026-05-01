using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Profiles;

[TestClass]
public sealed class ProfilesGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task ProfilesQuery_ReturnsArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  profiles { id name isDefault isBuiltIn }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["profiles"].Should().NotBeNull();
        json["data"]!["profiles"]!.AsArray().Should().NotBeNull();
    }

    [TestMethod]
    public async Task CreateProfileMutation_ValidInput_ReturnsProfile()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: CreateProfileInput!) {
                  createProfile(input: $input) {
                    profile { id name isDefault }
                    errors { code message }
                  }
                }
                """,
            variables = new
            {
                input = new
                {
                    name = "Integration Test Profile",
                    systemPrompt = "You are a test assistant.",
                    outputTemplate = "",
                    cleanupLevel = "NONE",
                    exportFolder = "_inbox",
                    autoTags = System.Array.Empty<string>(),
                    glossaryByLanguage = System.Array.Empty<object>(),
                    llmCorrectionEnabled = false,
                    isDefault = false
                }
            }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var errors = json["data"]!["createProfile"]!["errors"]!.AsArray();
        errors.Count.Should().Be(0);
        json["data"]!["createProfile"]!["profile"]!["name"]!.GetValue<string>().Should().Be("Integration Test Profile");
    }

    [TestMethod]
    public async Task CreateProfileMutation_EmptyName_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: CreateProfileInput!) {
                  createProfile(input: $input) {
                    profile { id }
                    errors { code message }
                  }
                }
                """,
            variables = new
            {
                input = new
                {
                    name = "",
                    systemPrompt = "",
                    outputTemplate = "",
                    cleanupLevel = "NONE",
                    exportFolder = "_inbox",
                    autoTags = System.Array.Empty<string>(),
                    glossaryByLanguage = System.Array.Empty<object>(),
                    llmCorrectionEnabled = false,
                    isDefault = false
                }
            }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["createProfile"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task DeleteProfileMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  deleteProfile(id: "00000000-0000-0000-0000-000000000001") {
                    profile { id }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["deleteProfile"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}

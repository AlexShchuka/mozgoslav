using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Prompts;

[TestClass]
public sealed class PromptsGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task PromptTemplatesQuery_ReturnsArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  promptTemplates { id name body createdAt }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["promptTemplates"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task CreatePromptTemplateMutation_ValidInput_ReturnsTemplate()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  createPromptTemplate(name: "Test Template", body: "Hello {{name}}") {
                    id name body createdAt
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var template = json["data"]!["createPromptTemplate"];
        template.Should().NotBeNull();
        template!["name"]!.GetValue<string>().Should().Be("Test Template");
        template["id"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task PreviewPromptQuery_ReturnsString()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  previewPrompt(templateBody: "Hello world")
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["previewPrompt"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task DeletePromptTemplateMutation_NotFound_ReturnsFalse()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($id: UUID!) {
                  deletePromptTemplate(id: $id)
                }
                """,
            variables = new { id = Guid.NewGuid() }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["deletePromptTemplate"]!.GetValue<bool>().Should().BeFalse();
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Notes;

[TestClass]
public sealed class NotesGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task CreateNoteMutation_ValidInput_ReturnsNote()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: CreateNoteInput!) {
                  createNote(input: $input) {
                    note { id title markdownContent }
                    errors { code message }
                  }
                }
                """,
            variables = new { input = new { title = "Test Note", body = "Test body content" } }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        var errors = json["data"]!["createNote"]!["errors"]!.AsArray();
        errors.Count.Should().Be(0);
        json["data"]!["createNote"]!["note"]!["title"]!.GetValue<string>().Should().Be("Test Note");
    }

    [TestMethod]
    public async Task CreateNoteMutation_EmptyTitle_ReturnsValidationError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: CreateNoteInput!) {
                  createNote(input: $input) {
                    note { id }
                    errors { code message }
                  }
                }
                """,
            variables = new { input = new { title = "" } }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["createNote"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task DeleteNoteMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  deleteNote(id: "00000000-0000-0000-0000-000000000001") {
                    note { id }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["deleteNote"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task ExportNoteMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  exportNote(id: "00000000-0000-0000-0000-000000000002") {
                    note { id }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["exportNote"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}

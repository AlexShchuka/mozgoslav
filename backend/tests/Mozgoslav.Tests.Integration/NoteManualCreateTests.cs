using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class NoteManualCreateTests : IntegrationTestsBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Post_Notes_WithTitleAndBody_Returns201_AndPersistsManualNote()
    {
        using var client = CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/notes",
            new { title = "Quick idea", body = "## First thought\n\nRemember this." },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
        created.GetProperty("id").GetGuid().Should().NotBeEmpty();
        created.GetProperty("markdownContent").GetString().Should().Contain("First thought");
        JsonSerializer.Serialize(created).Should().Contain("Manual");

        using var list = await client.GetAsync("/api/notes", TestContext.CancellationToken);
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await list.Content.ReadFromJsonAsync<List<ProcessedNote>>(Json, TestContext.CancellationToken);
        notes.Should().ContainSingle(n => n.Id == created.GetProperty("id").GetGuid());
    }

    [TestMethod]
    public async Task Post_Notes_WithoutBody_ReturnsCreatedStubWithDefaults()
    {
        using var client = CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/notes",
            new { },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
        created.GetProperty("id").GetGuid().Should().NotBeEmpty();
        created.TryGetProperty("markdownContent", out _).Should().BeTrue();
    }
}

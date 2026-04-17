using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007-shared §2.6 BC-022 — manual note creation endpoint.
/// Contract:
///   POST /api/notes { title?, body?, templateId? }
///     → 201 Created + ProcessedNote (Source = Manual).
/// </summary>
[TestClass]
public sealed class NoteManualCreateTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Post_Notes_WithTitleAndBody_Returns201_AndPersistsManualNote()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/notes",
            new { title = "Quick idea", body = "## First thought\n\nRemember this." },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
        created.GetProperty("id").GetGuid().Should().NotBeEmpty();
        created.GetProperty("markdownContent").GetString().Should().Contain("First thought");
        // §2.6 says `Source = Manual` — backend will surface it as either the
        // enum string or a boolean flag. We assert on the source-level token
        // so either representation passes as long as it carries "Manual".
        JsonSerializer.Serialize(created).Should().Contain("Manual");

        // Reading back through the list endpoint proves it persisted.
        using var list = await client.GetAsync("/api/notes", TestContext.CancellationToken);
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await list.Content.ReadFromJsonAsync<List<ProcessedNote>>(Json, TestContext.CancellationToken);
        notes.Should().ContainSingle(n => n.Id == created.GetProperty("id").GetGuid());
    }

    [TestMethod]
    public async Task Post_Notes_WithoutBody_ReturnsCreatedStubWithDefaults()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/notes",
            new { },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
        created.GetProperty("id").GetGuid().Should().NotBeEmpty();
        // Stub defaults survive — markdownContent is an empty-string placeholder,
        // NOT a missing field. Frontend relies on the property being present.
        created.TryGetProperty("markdownContent", out _).Should().BeTrue();
    }

    public TestContext TestContext { get; set; } = null!;
}

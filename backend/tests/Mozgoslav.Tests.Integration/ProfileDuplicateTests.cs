using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007-shared §2.6 BC-029 — duplicate-profile endpoint.
/// Contract:
///   POST /api/profiles/{id}/duplicate → 201 + Profile (new Id, IsBuiltIn=false).
/// </summary>
[TestClass]
public sealed class ProfileDuplicateTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Post_Duplicate_BuiltIn_ReturnsNewUserProfile()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var list = await client.GetAsync("/api/profiles", TestContext.CancellationToken);
        var profiles = await list.Content.ReadFromJsonAsync<List<Profile>>(Json, TestContext.CancellationToken);
        var source = profiles!.First(p => p.IsBuiltIn);

        using var response = await client.PostAsync(
            $"/api/profiles/{source.Id}/duplicate",
            content: null,
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var copy = await response.Content.ReadFromJsonAsync<Profile>(Json, TestContext.CancellationToken);
        copy!.Id.Should().NotBe(source.Id);
        copy.IsBuiltIn.Should().BeFalse();
        copy.IsDefault.Should().BeFalse();
        copy.Name.Should().NotBe(source.Name);  // "X (copy)" or similar
        copy.Name.Should().Contain(source.Name);
        copy.SystemPrompt.Should().Be(source.SystemPrompt);
        copy.CleanupLevel.Should().Be(source.CleanupLevel);
    }

    [TestMethod]
    public async Task Post_Duplicate_UnknownId_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync(
            $"/api/profiles/{Guid.NewGuid()}/duplicate",
            content: null,
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    public TestContext TestContext { get; set; } = null!;
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration;

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
        copy.Name.Should().NotBe(source.Name);
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

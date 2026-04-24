using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph;

public abstract class GraphTestsBase : IDisposable
{
    public TestContext TestContext { get; set; } = null!;

    protected GraphApiFactory Factory { get; private set; } = null!;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [TestInitialize]
    public void BaseInit() => Factory = new GraphApiFactory();

    [TestCleanup]
    public void BaseCleanup() => Factory.Dispose();

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (disposing) Factory.Dispose();
    }

    protected async Task<JsonNode> ExecuteAsync(string query, object? variables = null)
    {
        using var client = Factory.CreateClient();
        var body = JsonSerializer.Serialize(new { query, variables }, JsonOptions);
        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        using var response = await client.PostAsync("/graphql", content);
        response.IsSuccessStatusCode.Should().BeTrue($"GraphQL HTTP status was {(int)response.StatusCode}");
        var json = await response.Content.ReadAsStringAsync();
        var node = JsonNode.Parse(json);
        node.Should().NotBeNull();
        return node!;
    }
}

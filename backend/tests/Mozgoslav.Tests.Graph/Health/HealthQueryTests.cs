using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Health;

[TestClass]
public sealed class HealthQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Health_ReturnsOkStatus()
    {
        var result = await ExecuteAsync("{ health { status time } }");

        result["data"]!["health"]!["status"]!.GetValue<string>().Should().Be("ok");
        result["data"]!["health"]!["time"]!.GetValue<string>().Should().NotBeNullOrWhiteSpace();
    }

    [TestMethod]
    public async Task LlmHealth_ReturnsAvailableField()
    {
        var result = await ExecuteAsync("{ llmHealth { available } }");

        result["data"]!["llmHealth"].Should().NotBeNull();
        result["data"]!["llmHealth"]!["available"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task Meta_ReturnsVersionAndBuildDate()
    {
        var result = await ExecuteAsync("{ meta { version assemblyVersion commit buildDate } }");

        result["data"]!["meta"]!["version"]!.GetValue<string>().Should().NotBeNullOrWhiteSpace();
        result["data"]!["meta"]!["buildDate"]!.GetValue<string>().Should().NotBeNullOrWhiteSpace();
    }
}

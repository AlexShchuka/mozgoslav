using System.Net;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class PrometheusMetricsEndpointTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task Metrics_ReturnsOk_AndExposesAspNetCoreCounters()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync("/metrics");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().StartWith("text/plain");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotBeEmpty();
        body.Should().Contain("# TYPE", "Prometheus exposition format always annotates metric types");
    }
}

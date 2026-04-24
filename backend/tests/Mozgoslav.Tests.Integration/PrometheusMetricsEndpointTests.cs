using System.Net;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.Observability;

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

    [TestMethod]
    public async Task Metrics_ExposesMozgoslavCustomCounters_AfterActivity()
    {
        var metrics = GetRequiredService<MozgoslavMetrics>();
        metrics.RecordingsImported.Add(1);
        metrics.JobsCompleted.Add(1);
        metrics.TranscriptionDurationMs.Record(42);

        using var client = CreateClient();
        using var response = await client.GetAsync("/metrics");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("mozgoslav_recordings_imported",
            "custom MozgoslavMetrics counters must flow through the Prometheus exporter");
        body.Should().Contain("mozgoslav_jobs_completed");
        body.Should().Contain("mozgoslav_pipeline_transcription_duration");
    }
}

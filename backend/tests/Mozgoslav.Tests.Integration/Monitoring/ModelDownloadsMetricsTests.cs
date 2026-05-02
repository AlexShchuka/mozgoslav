using System.IO;
using System.Net;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.Observability;

namespace Mozgoslav.Tests.Integration.Monitoring;

[TestClass]
public sealed class ModelDownloadsMetricsTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task TC_M01_DownloadCounters_ExposedViaPrometheus()
    {
        var metrics = GetRequiredService<MozgoslavMetrics>();
        metrics.DownloadsStarted.Add(1, new System.Diagnostics.TagList { { "catalogue", "test-model" } });
        metrics.DownloadsCompleted.Add(1);
        metrics.DownloadsFailed.Add(1, new System.Diagnostics.TagList { { "kind", "Transient" } });
        metrics.DownloadsActive.Add(1);

        using var client = CreateClient();
        using var response = await client.GetAsync("/metrics");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();

        body.Should().Contain("mozgoslav_downloads_started_total",
            "DownloadsStarted counter must be exposed via Prometheus");
        body.Should().Contain("mozgoslav_downloads_completed_total",
            "DownloadsCompleted counter must be exposed via Prometheus");
        body.Should().Contain("mozgoslav_downloads_failed_total",
            "DownloadsFailed counter must be exposed via Prometheus");
        body.Should().Contain("mozgoslav_downloads_active",
            "DownloadsActive UpDownCounter must be exposed via Prometheus");
    }

    [TestMethod]
    public async Task TC_M02_DownloadDurationHistogram_ExposedViaPrometheus()
    {
        var metrics = GetRequiredService<MozgoslavMetrics>();
        metrics.DownloadDuration.Record(3.14);

        using var client = CreateClient();
        using var response = await client.GetAsync("/metrics");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();

        body.Should().Contain("mozgoslav_downloads_duration_seconds",
            "DownloadDuration histogram must be exposed via Prometheus with _seconds suffix");
    }

    [TestMethod]
    public void TC_M03_RunbookExists_AndContainsRequiredSections()
    {
        var runbookPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "..", "..", "..", "..", "..", "..", "docs", "runbooks", "model-downloads.md");

        var normalised = Path.GetFullPath(runbookPath);
        File.Exists(normalised).Should().BeTrue(
            $"Runbook must exist at docs/runbooks/model-downloads.md (resolved: {normalised})");

        var content = File.ReadAllText(normalised);
        content.Should().Contain("Failed", "runbook must describe what to do when a download is Failed");
        content.Should().Contain("partial", "runbook must describe how to clean up *.partial files");
        content.Should().Contain("SQLite", "runbook must explain how to remove stale DownloadJob rows from SQLite");
        content.Should().Contain("concurrency", "runbook must describe how to raise the concurrency limit");
    }
}

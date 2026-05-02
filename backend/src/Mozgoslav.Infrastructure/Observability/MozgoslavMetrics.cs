using System;
using System.Diagnostics.Metrics;

namespace Mozgoslav.Infrastructure.Observability;

public sealed class MozgoslavMetrics : IDisposable
{
    public const string MeterName = "Mozgoslav";

    private readonly Meter _meter;

    public Counter<long> RecordingsImported { get; }
    public Counter<long> JobsCompleted { get; }
    public Counter<long> JobsFailed { get; }
    public Histogram<double> TranscriptionDurationMs { get; }
    public Histogram<double> LlmDurationMs { get; }
    public Histogram<double> PipelineDurationMs { get; }
    public Histogram<double> ExportDurationMs { get; }
    public Counter<long> ObsidianExportAttempted { get; }
    public Counter<long> ObsidianExportFailure { get; }
    public Counter<long> ObsidianDiagnosticsCheck { get; }
    public Counter<long> ObsidianWizardStep { get; }

    public Counter<long> DownloadsStarted { get; }
    public Counter<long> DownloadsCompleted { get; }
    public Counter<long> DownloadsFailed { get; }
    public UpDownCounter<long> DownloadsActive { get; }
    public Histogram<double> DownloadDuration { get; }

    public MozgoslavMetrics()
    {
        _meter = new Meter(MeterName, "1.0.0");

        RecordingsImported = _meter.CreateCounter<long>("mozgoslav.recordings.imported", "recordings");
        JobsCompleted = _meter.CreateCounter<long>("mozgoslav.jobs.completed", "jobs");
        JobsFailed = _meter.CreateCounter<long>("mozgoslav.jobs.failed", "jobs");

        TranscriptionDurationMs = _meter.CreateHistogram<double>("mozgoslav.pipeline.transcription.duration", "ms");
        LlmDurationMs = _meter.CreateHistogram<double>("mozgoslav.pipeline.llm.duration", "ms");
        PipelineDurationMs = _meter.CreateHistogram<double>("mozgoslav.pipeline.total.duration", "ms");
        ExportDurationMs = _meter.CreateHistogram<double>("mozgoslav.pipeline.export.duration", "ms");

        ObsidianExportAttempted = _meter.CreateCounter<long>("mozgoslav.obsidian.export.attempted", "events");
        ObsidianExportFailure = _meter.CreateCounter<long>("mozgoslav.obsidian.export.failure", "events");
        ObsidianDiagnosticsCheck = _meter.CreateCounter<long>("mozgoslav.obsidian.diagnostics.check", "checks");
        ObsidianWizardStep = _meter.CreateCounter<long>("mozgoslav.obsidian.wizard.step", "steps");

        DownloadsStarted = _meter.CreateCounter<long>("mozgoslav.downloads.started_total", "downloads");
        DownloadsCompleted = _meter.CreateCounter<long>("mozgoslav.downloads.completed_total", "downloads");
        DownloadsFailed = _meter.CreateCounter<long>("mozgoslav.downloads.failed_total", "downloads");
        DownloadsActive = _meter.CreateUpDownCounter<long>("mozgoslav.downloads.active", "downloads");
        DownloadDuration = _meter.CreateHistogram<double>("mozgoslav.downloads.duration_seconds", "s");
    }

    public void Dispose() => _meter.Dispose();
}

using System.Diagnostics.Metrics;

namespace Mozgoslav.Infrastructure.Observability;

/// <summary>
/// Central place for application metrics. Values here are exposed through the
/// .NET meters pipeline (OpenTelemetry, dotnet-counters, etc.) — viewable in
/// development via <c>dotnet-counters monitor --name Mozgoslav</c>.
/// </summary>
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
    }

    public void Dispose() => _meter.Dispose();
}

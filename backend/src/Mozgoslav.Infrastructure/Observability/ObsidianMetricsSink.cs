using System.Collections.Generic;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Observability;

public sealed class ObsidianMetricsSink : IObsidianMetricsSink
{
    private readonly MozgoslavMetrics _metrics;

    public ObsidianMetricsSink(MozgoslavMetrics metrics)
    {
        _metrics = metrics;
    }

    public void RecordWizardStep(int wizardStep, string result)
    {
        _metrics.ObsidianWizardStep.Add(1,
            new KeyValuePair<string, object?>("step", wizardStep),
            new KeyValuePair<string, object?>("result", result));
    }
}

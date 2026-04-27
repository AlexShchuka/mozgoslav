namespace Mozgoslav.Application.Interfaces;

public interface IObsidianMetricsSink
{
    void RecordWizardStep(int wizardStep, string result);
}

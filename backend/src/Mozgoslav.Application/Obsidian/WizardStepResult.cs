namespace Mozgoslav.Application.Obsidian;

public sealed record WizardStepResult(
    int CurrentStep,
    int? NextStep,
    VaultDiagnosticsReport Diagnostics);

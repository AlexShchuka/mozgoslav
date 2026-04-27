using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Api.GraphQL.Obsidian;

[ExtendObjectType(typeof(MutationType))]
public sealed class ObsidianMutationType
{
    public async Task<SetupObsidianPayload> SetupObsidian(
        string? vaultPath,
        [Service] VaultSidecarOrchestrator orchestrator,
        [Service] IVaultBootstrapProvider bootstrap,
        [Service] IAppSettings settings,
        CancellationToken ct)
    {
        var target = string.IsNullOrWhiteSpace(vaultPath) ? settings.VaultPath : vaultPath;
        if (string.IsNullOrWhiteSpace(target))
        {
            return new SetupObsidianPayload(null, [new ValidationError("VALIDATION", "Vault path is not configured", "vaultPath")]);
        }
        try
        {
            var spec = BuildSpec(target, bootstrap);
            var result = await orchestrator.ApplyAsync(spec, ct);
            if (string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                await settings.SaveAsync(settings.Snapshot with { VaultPath = target }, ct);
            }
            return new SetupObsidianPayload(
                new ObsidianSetupReport(target, result.Receipt.Overwritten, result.Receipt.Skipped),
                []);
        }
        catch (Exception ex)
        {
            return new SetupObsidianPayload(null, [new ValidationError("SETUP_FAILED", ex.Message, "vaultPath")]);
        }
    }

    public async Task<ObsidianDiagnosticsPayload> ObsidianRunDiagnostics(
        [Service] IVaultDiagnostics diagnostics,
        CancellationToken ct)
    {
        try
        {
            var report = await diagnostics.RunAsync(ct);
            return new ObsidianDiagnosticsPayload(report, []);
        }
        catch (Exception ex)
        {
            return new ObsidianDiagnosticsPayload(null, [new UnavailableError("DIAGNOSTICS_FAILED", ex.Message)]);
        }
    }

    public async Task<ObsidianWizardStepPayload> ObsidianRunWizardStep(
        int step,
        [Service] VaultSidecarOrchestrator orchestrator,
        CancellationToken ct)
    {
        if (step < 1 || step > 5)
        {
            return new ObsidianWizardStepPayload(step, null, null,
                [new ValidationError("VALIDATION", "Wizard step must be in range 1..5", "step")]);
        }
        try
        {
            var result = await orchestrator.RunWizardStepAsync(step, ct);
            return new ObsidianWizardStepPayload(result.CurrentStep, result.NextStep, result.Diagnostics, []);
        }
        catch (InvalidOperationException ex)
        {
            return new ObsidianWizardStepPayload(step, null, null,
                [new ValidationError("WIZARD_STEP_FAILED", ex.Message, "step")]);
        }
        catch (Exception ex)
        {
            return new ObsidianWizardStepPayload(step, null, null,
                [new UnavailableError("WIZARD_STEP_FAILED", ex.Message)]);
        }
    }

    public async Task<ObsidianReapplyBootstrapPayload> ObsidianReapplyBootstrap(
        [Service] VaultSidecarOrchestrator orchestrator,
        CancellationToken ct)
    {
        try
        {
            var result = await orchestrator.ReapplyBootstrapAsync(ct);
            return new ObsidianReapplyBootstrapPayload(result.Overwritten, result.Skipped, result.BackedUpTo, []);
        }
        catch (InvalidOperationException ex)
        {
            return new ObsidianReapplyBootstrapPayload([], [], null,
                [new ValidationError("REAPPLY_FAILED", ex.Message, "vaultPath")]);
        }
        catch (Exception ex)
        {
            return new ObsidianReapplyBootstrapPayload([], [], null,
                [new UnavailableError("REAPPLY_FAILED", ex.Message)]);
        }
    }

    public async Task<ObsidianReinstallPluginsPayload> ObsidianReinstallPlugins(
        [Service] VaultSidecarOrchestrator orchestrator,
        [Service] IAppSettings settings,
        CancellationToken ct)
    {
        var vaultRoot = settings.VaultPath;
        if (string.IsNullOrWhiteSpace(vaultRoot))
        {
            return new ObsidianReinstallPluginsPayload([],
                [new ValidationError("VALIDATION", "Vault path is not configured", "vaultPath")]);
        }
        try
        {
            var result = await orchestrator.ReinstallPluginsAsync(vaultRoot, ct);
            return new ObsidianReinstallPluginsPayload(result.Reinstalled, []);
        }
        catch (InvalidOperationException ex)
        {
            return new ObsidianReinstallPluginsPayload([],
                [new ValidationError("REINSTALL_FAILED", ex.Message, "vaultPath")]);
        }
        catch (Exception ex)
        {
            return new ObsidianReinstallPluginsPayload([],
                [new UnavailableError("REINSTALL_FAILED", ex.Message)]);
        }
    }

    private static VaultProvisioningSpec BuildSpec(string vaultRoot, IVaultBootstrapProvider bootstrap)
    {
        var manifest = bootstrap.Manifest;
        var files = new List<BootstrapFileSpec>(manifest.Count);
        foreach (var entry in manifest)
        {
            files.Add(new BootstrapFileSpec(
                entry.VaultRelativePath,
                entry.EmbeddedResourceKey,
                entry.WritePolicy,
                entry.Sha256));
        }
        return new VaultProvisioningSpec(vaultRoot, files);
    }
}

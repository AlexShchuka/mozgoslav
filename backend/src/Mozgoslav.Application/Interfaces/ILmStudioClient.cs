namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Discovers models loaded in a running LM Studio instance via its
/// OpenAI-compatible <c>/v1/models</c> endpoint. Pure read — Mozgoslav never
/// downloads or side-loads models; those flows live in LM Studio itself.
/// </summary>
public interface ILmStudioClient
{
    /// <summary>
    /// Returns the list of models currently loaded in LM Studio together with
    /// a <c>reachable</c> flag. Per ADR-006 D-11 the UI uses <c>reachable</c>
    /// to swap between "install LM Studio" empty-state copy and the
    /// real "no models loaded yet" state.
    /// </summary>
    Task<LmStudioDiscoveryResult> ListModelsAsync(CancellationToken ct);
}

public sealed record LmStudioModel(string Id, string Object);

public sealed record LmStudioDiscoveryResult(
    IReadOnlyList<LmStudioModel> Installed,
    bool Reachable);

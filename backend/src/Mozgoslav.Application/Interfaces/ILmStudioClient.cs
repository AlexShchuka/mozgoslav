namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Discovers models loaded in a running LM Studio instance via its
/// OpenAI-compatible <c>/v1/models</c> endpoint. Pure read — Mozgoslav never
/// downloads or side-loads models; those flows live in LM Studio itself.
/// </summary>
public interface ILmStudioClient
{
    /// <summary>
    /// Returns ids of models currently loaded in LM Studio, or an empty list
    /// when the endpoint is unreachable / not responding with JSON.
    /// </summary>
    Task<IReadOnlyList<LmStudioModel>> ListModelsAsync(CancellationToken ct);
}

public sealed record LmStudioModel(string Id, string Object);

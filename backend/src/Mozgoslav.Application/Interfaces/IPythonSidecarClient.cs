using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Typed HTTP client for the Python ML sidecar (``python-sidecar/``).
/// Exposes the four heavy ML endpoints (diarize / gender / emotion / ner).
/// Tier-2 endpoints (gender / emotion) can throw
/// <see cref="SidecarModelUnavailableException"/> when the user has
/// not downloaded the weights yet; Tier-1 endpoints always return a
/// result. Implementations also transparently handle the "sidecar is
/// down" case by throwing <see cref="HttpRequestException"/>, so the
/// caller can decide whether to degrade or surface the error.
/// </summary>
public interface IPythonSidecarClient
{
    Task<SidecarDiarizeResult> DiarizeAsync(string audioPath, CancellationToken ct);

    Task<SidecarGenderResult> GenderAsync(string audioPath, CancellationToken ct);

    Task<SidecarEmotionResult> EmotionAsync(string audioPath, CancellationToken ct);

    Task<SidecarNerResult> NerAsync(string text, CancellationToken ct);
}

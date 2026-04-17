namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Selects the <see cref="ILlmProvider"/> matching the user's current
/// <c>LlmProvider</c> setting. Implementations typically receive all
/// registered providers via constructor injection and pick by
/// <see cref="ILlmProvider.Kind"/>.
/// </summary>
public interface ILlmProviderFactory
{
    /// <summary>
    /// Returns the provider currently configured in AppSettings. Throws
    /// <see cref="InvalidOperationException"/> if no provider is registered
    /// for the requested kind.
    /// </summary>
    Task<ILlmProvider> GetCurrentAsync(CancellationToken ct);
}

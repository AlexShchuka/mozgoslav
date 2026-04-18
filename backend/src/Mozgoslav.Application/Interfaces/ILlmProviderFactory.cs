namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// BC-036 selects the currently active <see cref="ILlmProvider"/>
/// based on <see cref="IAppSettings.LlmProvider"/>. The factory is cheap — it
/// simply matches the setting value against the <see cref="ILlmProvider.Kind"/>
/// of each registered provider. Unknown or empty values fall back to
/// <c>"openai_compatible"</c> with a WARN log so a misconfigured UI never
/// leaves the LLM surface unreachable.
/// </summary>
public interface ILlmProviderFactory
{
    /// <summary>
    /// Returns the provider whose <see cref="ILlmProvider.Kind"/> matches the
    /// persisted setting. Never throws — on miss, logs WARN and returns the
    /// default <c>openai_compatible</c> provider.
    /// </summary>
    Task<ILlmProvider> GetCurrentAsync(CancellationToken ct);
}

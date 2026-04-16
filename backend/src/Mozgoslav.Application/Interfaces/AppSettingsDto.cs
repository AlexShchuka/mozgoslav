namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Snapshot of all persisted application settings. Immutable — updates are produced
/// via record <c>with</c> expressions and then persisted through
/// <see cref="IAppSettings.SaveAsync"/>.
/// </summary>
public sealed record AppSettingsDto(
    string VaultPath,
    string LlmEndpoint,
    string LlmModel,
    string LlmApiKey,
    string ObsidianApiHost,
    string ObsidianApiToken,
    string WhisperModelPath,
    string VadModelPath,
    string Language,
    string ThemeMode,
    int WhisperThreads)
{
    public static AppSettingsDto Defaults { get; } = new(
        VaultPath: string.Empty,
        LlmEndpoint: "http://localhost:1234",
        LlmModel: "default",
        LlmApiKey: string.Empty,
        ObsidianApiHost: "http://127.0.0.1:27123",
        ObsidianApiToken: string.Empty,
        WhisperModelPath: string.Empty,
        VadModelPath: string.Empty,
        Language: "ru",
        ThemeMode: "system",
        WhisperThreads: 0);
}

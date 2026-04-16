namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Persistent application settings, stored in the <c>settings</c> key/value table.
/// Secrets (LLM API key, Obsidian token) stay local — they are never sent anywhere
/// outside the user-configured endpoint they belong to.
/// </summary>
public interface IAppSettings
{
    string VaultPath { get; }
    string LlmEndpoint { get; }
    string LlmModel { get; }
    string LlmApiKey { get; }
    string ObsidianApiHost { get; }
    string ObsidianApiToken { get; }
    string WhisperModelPath { get; }
    string VadModelPath { get; }
    string Language { get; }
    string ThemeMode { get; }
    int WhisperThreads { get; }

    AppSettingsDto Snapshot { get; }

    Task<AppSettingsDto> LoadAsync(CancellationToken ct);
    Task SaveAsync(AppSettingsDto dto, CancellationToken ct);
    Task ReloadAsync(CancellationToken ct);
}

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

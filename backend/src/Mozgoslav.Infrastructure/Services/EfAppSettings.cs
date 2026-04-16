using Microsoft.EntityFrameworkCore;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Settings store on top of the EF Core <c>AppSetting</c> key/value table.
/// Caches the latest snapshot in memory; writes are wrapped in a transaction so
/// partial failures never leave the table in a split state.
/// </summary>
public sealed class EfAppSettings : IAppSettings
{
    private readonly IDbContextFactory<MozgoslavDbContext> _contextFactory;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private AppSettingsDto _snapshot = AppSettingsDto.Defaults;

    public EfAppSettings(IDbContextFactory<MozgoslavDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    public string VaultPath => _snapshot.VaultPath;
    public string LlmEndpoint => _snapshot.LlmEndpoint;
    public string LlmModel => _snapshot.LlmModel;
    public string LlmApiKey => _snapshot.LlmApiKey;
    public string ObsidianApiHost => _snapshot.ObsidianApiHost;
    public string ObsidianApiToken => _snapshot.ObsidianApiToken;
    public string WhisperModelPath => _snapshot.WhisperModelPath;
    public string VadModelPath => _snapshot.VadModelPath;
    public string Language => _snapshot.Language;
    public string ThemeMode => _snapshot.ThemeMode;
    public int WhisperThreads => _snapshot.WhisperThreads;
    public AppSettingsDto Snapshot => _snapshot;

    public async Task<AppSettingsDto> LoadAsync(CancellationToken ct)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(ct);
        var map = await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        var defaults = AppSettingsDto.Defaults;
        var dto = new AppSettingsDto(
            VaultPath: map.GetValueOrDefault(Keys.VaultPath, defaults.VaultPath),
            LlmEndpoint: map.GetValueOrDefault(Keys.LlmEndpoint, defaults.LlmEndpoint),
            LlmModel: map.GetValueOrDefault(Keys.LlmModel, defaults.LlmModel),
            LlmApiKey: map.GetValueOrDefault(Keys.LlmApiKey, defaults.LlmApiKey),
            ObsidianApiHost: map.GetValueOrDefault(Keys.ObsidianApiHost, defaults.ObsidianApiHost),
            ObsidianApiToken: map.GetValueOrDefault(Keys.ObsidianApiToken, defaults.ObsidianApiToken),
            WhisperModelPath: map.GetValueOrDefault(Keys.WhisperModelPath, defaults.WhisperModelPath),
            VadModelPath: map.GetValueOrDefault(Keys.VadModelPath, defaults.VadModelPath),
            Language: map.GetValueOrDefault(Keys.Language, defaults.Language),
            ThemeMode: map.GetValueOrDefault(Keys.ThemeMode, defaults.ThemeMode),
            WhisperThreads: int.TryParse(map.GetValueOrDefault(Keys.WhisperThreads, "0"), out var t) ? t : 0);

        await _lock.WaitAsync(ct);
        try { _snapshot = dto; }
        finally { _lock.Release(); }

        return dto;
    }

    public async Task SaveAsync(AppSettingsDto dto, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var entries = new (string Key, string Value)[]
        {
            (Keys.VaultPath, dto.VaultPath),
            (Keys.LlmEndpoint, dto.LlmEndpoint),
            (Keys.LlmModel, dto.LlmModel),
            (Keys.LlmApiKey, dto.LlmApiKey),
            (Keys.ObsidianApiHost, dto.ObsidianApiHost),
            (Keys.ObsidianApiToken, dto.ObsidianApiToken),
            (Keys.WhisperModelPath, dto.WhisperModelPath),
            (Keys.VadModelPath, dto.VadModelPath),
            (Keys.Language, dto.Language),
            (Keys.ThemeMode, dto.ThemeMode),
            (Keys.WhisperThreads, dto.WhisperThreads.ToString()),
        };

        await using var db = await _contextFactory.CreateDbContextAsync(ct);
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        foreach (var (key, value) in entries)
        {
            var existing = await db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
            if (existing is null)
            {
                db.Settings.Add(new AppSetting { Key = key, Value = value });
            }
            else
            {
                existing.Value = value;
            }
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await _lock.WaitAsync(ct);
        try { _snapshot = dto; }
        finally { _lock.Release(); }
    }

    public async Task ReloadAsync(CancellationToken ct)
    {
        await LoadAsync(ct);
    }

    private static class Keys
    {
        public const string VaultPath = "vault_path";
        public const string LlmEndpoint = "llm_endpoint";
        public const string LlmModel = "llm_model";
        public const string LlmApiKey = "llm_api_key";
        public const string ObsidianApiHost = "obsidian_api_host";
        public const string ObsidianApiToken = "obsidian_api_token";
        public const string WhisperModelPath = "whisper_model_path";
        public const string VadModelPath = "vad_model_path";
        public const string Language = "language";
        public const string ThemeMode = "theme_mode";
        public const string WhisperThreads = "whisper_threads";
    }
}

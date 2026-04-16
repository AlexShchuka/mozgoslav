using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Settings store on top of the EF Core <c>AppSetting</c> key/value table.
/// Caches the latest snapshot in memory; writes are wrapped in a transaction so
/// partial failures never leave the table in a split state.
/// </summary>
public sealed class EfAppSettings : IAppSettings, IDisposable
{
    private readonly IDbContextFactory<MozgoslavDbContext> _contextFactory;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public EfAppSettings(IDbContextFactory<MozgoslavDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    public void Dispose() => _lock.Dispose();

    public string VaultPath => Snapshot.VaultPath;
    public string LlmEndpoint => Snapshot.LlmEndpoint;
    public string LlmModel => Snapshot.LlmModel;
    public string LlmApiKey => Snapshot.LlmApiKey;
    public string ObsidianApiHost => Snapshot.ObsidianApiHost;
    public string ObsidianApiToken => Snapshot.ObsidianApiToken;
    public string WhisperModelPath => Snapshot.WhisperModelPath;
    public string VadModelPath => Snapshot.VadModelPath;
    public string Language => Snapshot.Language;
    public string ThemeMode => Snapshot.ThemeMode;
    public int WhisperThreads => Snapshot.WhisperThreads;
    public bool DictationEnabled => Snapshot.DictationEnabled;
    public string DictationHotkeyType => Snapshot.DictationHotkeyType;
    public int DictationMouseButton => Snapshot.DictationMouseButton;
    public string DictationKeyboardHotkey => Snapshot.DictationKeyboardHotkey;
    public string DictationLanguage => Snapshot.DictationLanguage;
    public string DictationWhisperModelId => Snapshot.DictationWhisperModelId;
    public int DictationCaptureSampleRate => Snapshot.DictationCaptureSampleRate;
    public bool DictationLlmPolish => Snapshot.DictationLlmPolish;
    public string DictationInjectMode => Snapshot.DictationInjectMode;
    public bool DictationOverlayEnabled => Snapshot.DictationOverlayEnabled;
    public string DictationOverlayPosition => Snapshot.DictationOverlayPosition;
    public bool DictationSoundFeedback => Snapshot.DictationSoundFeedback;
    public AppSettingsDto Snapshot { get; private set; } = AppSettingsDto.Defaults;

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
            WhisperThreads: int.TryParse(map.GetValueOrDefault(Keys.WhisperThreads, "0"), out var t) ? t : 0,
            DictationEnabled: ParseBool(map, Keys.DictationEnabled, defaults.DictationEnabled),
            DictationHotkeyType: map.GetValueOrDefault(Keys.DictationHotkeyType, defaults.DictationHotkeyType),
            DictationMouseButton: ParseInt(map, Keys.DictationMouseButton, defaults.DictationMouseButton),
            DictationKeyboardHotkey: map.GetValueOrDefault(Keys.DictationKeyboardHotkey, defaults.DictationKeyboardHotkey),
            DictationLanguage: map.GetValueOrDefault(Keys.DictationLanguage, defaults.DictationLanguage),
            DictationWhisperModelId: map.GetValueOrDefault(Keys.DictationWhisperModelId, defaults.DictationWhisperModelId),
            DictationCaptureSampleRate: ParseInt(map, Keys.DictationCaptureSampleRate, defaults.DictationCaptureSampleRate),
            DictationLlmPolish: ParseBool(map, Keys.DictationLlmPolish, defaults.DictationLlmPolish),
            DictationInjectMode: map.GetValueOrDefault(Keys.DictationInjectMode, defaults.DictationInjectMode),
            DictationOverlayEnabled: ParseBool(map, Keys.DictationOverlayEnabled, defaults.DictationOverlayEnabled),
            DictationOverlayPosition: map.GetValueOrDefault(Keys.DictationOverlayPosition, defaults.DictationOverlayPosition),
            DictationSoundFeedback: ParseBool(map, Keys.DictationSoundFeedback, defaults.DictationSoundFeedback));

        await _lock.WaitAsync(ct);
        try { Snapshot = dto; }
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
            (Keys.WhisperThreads, dto.WhisperThreads.ToString(CultureInfo.InvariantCulture)),
            (Keys.DictationEnabled, BoolToString(dto.DictationEnabled)),
            (Keys.DictationHotkeyType, dto.DictationHotkeyType),
            (Keys.DictationMouseButton, dto.DictationMouseButton.ToString(CultureInfo.InvariantCulture)),
            (Keys.DictationKeyboardHotkey, dto.DictationKeyboardHotkey),
            (Keys.DictationLanguage, dto.DictationLanguage),
            (Keys.DictationWhisperModelId, dto.DictationWhisperModelId),
            (Keys.DictationCaptureSampleRate, dto.DictationCaptureSampleRate.ToString(CultureInfo.InvariantCulture)),
            (Keys.DictationLlmPolish, BoolToString(dto.DictationLlmPolish)),
            (Keys.DictationInjectMode, dto.DictationInjectMode),
            (Keys.DictationOverlayEnabled, BoolToString(dto.DictationOverlayEnabled)),
            (Keys.DictationOverlayPosition, dto.DictationOverlayPosition),
            (Keys.DictationSoundFeedback, BoolToString(dto.DictationSoundFeedback))
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
        try { Snapshot = dto; }
        finally { _lock.Release(); }
    }

    public async Task ReloadAsync(CancellationToken ct) => await LoadAsync(ct);

    private static int ParseInt(IReadOnlyDictionary<string, string> map, string key, int fallback) =>
        map.TryGetValue(key, out var raw) && int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : fallback;

    private static bool ParseBool(IReadOnlyDictionary<string, string> map, string key, bool fallback) =>
        map.TryGetValue(key, out var raw) && bool.TryParse(raw, out var value) ? value : fallback;

    private static string BoolToString(bool value) =>
        value ? "true" : "false";

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
        public const string DictationEnabled = "dictation_enabled";
        public const string DictationHotkeyType = "dictation_hotkey_type";
        public const string DictationMouseButton = "dictation_mouse_button";
        public const string DictationKeyboardHotkey = "dictation_keyboard_hotkey";
        public const string DictationLanguage = "dictation_language";
        public const string DictationWhisperModelId = "dictation_whisper_model_id";
        public const string DictationCaptureSampleRate = "dictation_capture_sample_rate";
        public const string DictationLlmPolish = "dictation_llm_polish";
        public const string DictationInjectMode = "dictation_inject_mode";
        public const string DictationOverlayEnabled = "dictation_overlay_enabled";
        public const string DictationOverlayPosition = "dictation_overlay_position";
        public const string DictationSoundFeedback = "dictation_sound_feedback";
    }
}

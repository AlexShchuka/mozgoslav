using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.WebSearch;

public sealed class SearxngConfigService
{
    private static readonly string UserSettingsPath = Path.Combine(
        AppPaths.Root, "searxng", "settings.yml");

    private readonly string _bundledSettingsPath;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SearxngConfigService> _logger;

    public SearxngConfigService(
        string bundledSettingsPath,
        IConfiguration configuration,
        ILogger<SearxngConfigService> logger)
    {
        _bundledSettingsPath = bundledSettingsPath;
        _configuration = configuration;
        _logger = logger;
    }

    public int CacheTtlHours =>
        _configuration.GetValue<int>("Mozgoslav:Web:Extract:CacheTtlHours", defaultValue: 24);

    public async Task<SearxngEngineConfig> ReadEnginesAsync(CancellationToken ct)
    {
        EnsureUserSettingsExist();
        var yaml = await File.ReadAllTextAsync(UserSettingsPath, ct);
        return ParseEngines(yaml);
    }

    public async Task<string> ReadRawYamlAsync(CancellationToken ct)
    {
        EnsureUserSettingsExist();
        return await File.ReadAllTextAsync(UserSettingsPath, ct);
    }

    public async Task WriteEnginesAsync(
        bool ddgEnabled, bool yandexEnabled, bool googleEnabled,
        CancellationToken ct)
    {
        EnsureUserSettingsExist();
        var yaml = await File.ReadAllTextAsync(UserSettingsPath, ct);

        yaml = SetEngineEnabled(yaml, "duckduckgo", ddgEnabled);
        yaml = SetEngineEnabled(yaml, "yandex", yandexEnabled);
        yaml = SetEngineEnabled(yaml, "google", googleEnabled);

        await File.WriteAllTextAsync(UserSettingsPath, yaml, ct);
    }

    private void EnsureUserSettingsExist()
    {
        if (File.Exists(UserSettingsPath))
        {
            return;
        }

        var dir = Path.GetDirectoryName(UserSettingsPath)!;
        Directory.CreateDirectory(dir);

        if (File.Exists(_bundledSettingsPath))
        {
            File.Copy(_bundledSettingsPath, UserSettingsPath);
            _logger.LogInformation(
                "Copied bundled SearXNG settings to {Path}", UserSettingsPath);
        }
        else
        {
            File.WriteAllText(UserSettingsPath, BuildDefaultYaml());
            _logger.LogInformation(
                "Created default SearXNG settings at {Path}", UserSettingsPath);
        }
    }

    private static SearxngEngineConfig ParseEngines(string yaml)
    {
        return new SearxngEngineConfig(
            DdgEnabled: IsEngineEnabled(yaml, "duckduckgo"),
            YandexEnabled: IsEngineEnabled(yaml, "yandex"),
            GoogleEnabled: IsEngineEnabled(yaml, "google"));
    }

    private static bool IsEngineEnabled(string yaml, string engineName)
    {
        var pattern = $@"- name:\s*{Regex.Escape(engineName)}.*?(?:disabled:\s*(true|false))?(?=\s*- name:|\z)";
        var match = Regex.Match(yaml, pattern,
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        if (!match.Success)
        {
            return true;
        }

        var disabledGroup = match.Groups[1];
        if (!disabledGroup.Success)
        {
            return true;
        }

        return !string.Equals(disabledGroup.Value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static string SetEngineEnabled(string yaml, string engineName, bool enabled)
    {
        var disabledValue = enabled ? "false" : "true";

        var pattern = $@"(- name:\s*{Regex.Escape(engineName)}[^\n]*(?:\n(?!- name:)[^\n]*)*)";
        return Regex.Replace(yaml, pattern, match =>
        {
            var block = match.Value;

            var disabledLinePattern = @"(\s*disabled:\s*)(true|false)";
            if (Regex.IsMatch(block, disabledLinePattern, RegexOptions.IgnoreCase))
            {
                return Regex.Replace(
                    block,
                    disabledLinePattern,
                    m => $"{m.Groups[1].Value}{disabledValue}",
                    RegexOptions.IgnoreCase);
            }

            var lastLine = block.TrimEnd();
            var indent = "    ";
            return $"{lastLine}\n{indent}disabled: {disabledValue}";
        }, RegexOptions.Singleline);
    }

    private static string BuildDefaultYaml() => """
        use_default_settings: true

        server:
          bind_address: "127.0.0.1"
          port: 8888
          secret_key: "mozgoslav-searxng-local"

        search:
          safe_search: 0
          autocomplete: ""
          default_lang: ""

        outgoing:
          proxies: {}

        engines:
          - name: duckduckgo
            engine: duckduckgo
            categories: general
            disabled: false
            timeout: 3.0

          - name: yandex
            engine: yandex
            categories: general
            disabled: false
            timeout: 3.0

          - name: google
            engine: google
            categories: general
            disabled: false
            timeout: 3.0
        """;
}

public sealed record SearxngEngineConfig(
    bool DdgEnabled,
    bool YandexEnabled,
    bool GoogleEnabled);

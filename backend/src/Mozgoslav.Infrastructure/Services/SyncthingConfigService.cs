using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

using Microsoft.Extensions.Logging;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// ADR-003 D2+D4 and ADR-004 R8: generates Syncthing's <c>config.xml</c> for
/// our three managed folders — recordings (staggered versioning, 30d),
/// notes (trashcan, 30d) and the optional Obsidian vault (trashcan, 14d).
/// Idempotent: if a config already exists we leave it alone so the user's
/// manual edits survive upgrades.
/// </summary>
public sealed class SyncthingConfigService
{
    public const string RecordingsFolderId = "mozgoslav-recordings";
    public const string NotesFolderId = "mozgoslav-notes";
    public const string VaultFolderId = "mozgoslav-obsidian-vault";

    private readonly ILogger<SyncthingConfigService> _logger;

    public SyncthingConfigService(ILogger<SyncthingConfigService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Writes a fresh <c>config.xml</c> at <paramref name="configPath"/> if one
    /// does not already exist. Returns <c>true</c> when a new config was
    /// written, <c>false</c> when an existing one was preserved.
    /// </summary>
    public bool EnsureConfig(
        string configPath,
        SyncthingConfigInputs inputs)
    {
        ArgumentNullException.ThrowIfNull(configPath);
        ArgumentNullException.ThrowIfNull(inputs);

        if (File.Exists(configPath))
        {
            _logger.LogInformation("Syncthing config already present at {Path}; preserving", configPath);
            return false;
        }

        var doc = Build(inputs);

        Directory.CreateDirectory(Path.GetDirectoryName(configPath)!);
        using var writer = new StreamWriter(configPath, append: false, Encoding.UTF8);
        doc.Save(writer);
        _logger.LogInformation("Wrote Syncthing config at {Path}", configPath);
        return true;
    }

    /// <summary>Deterministic XML builder — exposed so tests can assert over the document without touching disk.</summary>
    public static XDocument Build(SyncthingConfigInputs inputs)
    {
        ArgumentNullException.ThrowIfNull(inputs);
        ArgumentException.ThrowIfNullOrWhiteSpace(inputs.LocalDeviceId);
        ArgumentException.ThrowIfNullOrWhiteSpace(inputs.LocalDeviceName);
        ArgumentException.ThrowIfNullOrWhiteSpace(inputs.RecordingsPath);
        ArgumentException.ThrowIfNullOrWhiteSpace(inputs.NotesPath);
        ArgumentException.ThrowIfNullOrWhiteSpace(inputs.GuiApiKey);

        var folders = new List<XElement>
        {
            BuildFolder(RecordingsFolderId, "Mozgoslav — Recordings", inputs.RecordingsPath, inputs.LocalDeviceId, Versioning.Staggered30Days),
            BuildFolder(NotesFolderId, "Mozgoslav — Notes", inputs.NotesPath, inputs.LocalDeviceId, Versioning.Trashcan30Days),
        };
        if (!string.IsNullOrWhiteSpace(inputs.VaultPath))
        {
            folders.Add(BuildFolder(VaultFolderId, "Mozgoslav — Obsidian Vault", inputs.VaultPath, inputs.LocalDeviceId, Versioning.Trashcan14Days));
        }

        var devices = new XElement("device",
            new XAttribute("id", inputs.LocalDeviceId),
            new XAttribute("name", inputs.LocalDeviceName),
            new XAttribute("compression", "metadata"),
            new XAttribute("introducer", "false"));

        var config = new XElement("configuration",
            new XAttribute("version", "37"),
            folders,
            devices,
            new XElement("gui",
                new XAttribute("enabled", "true"),
                new XAttribute("tls", "false"),
                new XElement("address", "127.0.0.1:0"),
                new XElement("apikey", inputs.GuiApiKey)),
            new XElement("options",
                new XElement("globalAnnounceEnabled", "true"),
                new XElement("localAnnounceEnabled", "true"),
                new XElement("relaysEnabled", "true"),
                new XElement("natEnabled", "true"),
                new XElement("urAccepted", "-1"),
                new XElement("crashReportingEnabled", "false")));

        return new XDocument(new XDeclaration("1.0", "utf-8", null), config);
    }

    private static XElement BuildFolder(string id, string label, string path, string localDeviceId, Versioning versioning)
    {
        var folder = new XElement("folder",
            new XAttribute("id", id),
            new XAttribute("label", label),
            new XAttribute("path", path),
            new XAttribute("type", "sendreceive"),
            new XAttribute("rescanIntervalS", "60"),
            new XAttribute("fsWatcherEnabled", "true"),
            new XAttribute("fsWatcherDelayS", "10"),
            new XAttribute("ignorePerms", "false"),
            new XAttribute("autoNormalize", "true"));

        folder.Add(new XElement("device",
            new XAttribute("id", localDeviceId)));

        folder.Add(versioning.ToXml());
        return folder;
    }

    /// <summary>Produces a fresh Syncthing GUI API key (base64-hex, 32 bytes).</summary>
    public static string GenerateApiKey()
    {
        Span<byte> buffer = stackalloc byte[32];
        RandomNumberGenerator.Fill(buffer);
        return Convert.ToHexStringLower(buffer);
    }

    private sealed class Versioning
    {
        public static Versioning Staggered30Days { get; } = new("staggered", new Dictionary<string, string>
        {
            ["cleanInterval"] = "3600",
            ["maxAge"] = (30 * 24 * 3600).ToString(CultureInfo.InvariantCulture),
            ["versionsPath"] = string.Empty,
        });

        public static Versioning Trashcan30Days { get; } = new("trashcan", new Dictionary<string, string>
        {
            ["cleanoutDays"] = "30",
        });

        public static Versioning Trashcan14Days { get; } = new("trashcan", new Dictionary<string, string>
        {
            ["cleanoutDays"] = "14",
        });

        private readonly string _type;
        private readonly IReadOnlyDictionary<string, string> _params;

        private Versioning(string type, IReadOnlyDictionary<string, string> parameters)
        {
            _type = type;
            _params = parameters;
        }

        public XElement ToXml()
        {
            var element = new XElement("versioning",
                new XAttribute("type", _type));
            foreach (var (k, v) in _params)
            {
                element.Add(new XElement("param",
                    new XAttribute("key", k),
                    new XAttribute("val", v)));
            }
            return element;
        }
    }
}

/// <summary>
/// Inputs for <see cref="SyncthingConfigService.EnsureConfig"/> —
/// grouped into a record to keep the call-site self-documenting.
/// </summary>
public sealed record SyncthingConfigInputs(
    string LocalDeviceId,
    string LocalDeviceName,
    string RecordingsPath,
    string NotesPath,
    string VaultPath,
    string GuiApiKey);

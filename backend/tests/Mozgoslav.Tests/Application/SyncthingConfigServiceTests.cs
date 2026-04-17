using System.Xml.Linq;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// Verifies the generated Syncthing <c>config.xml</c> (ADR-003 D4 + ADR-004 R8):
/// three folders with the right ids and versioning policies, plus the usual
/// GUI + discovery / relay defaults.
/// </summary>
[TestClass]
public sealed class SyncthingConfigServiceTests
{
    private static readonly SyncthingConfigInputs SampleInputs = new(
        LocalDeviceId: "AAAAAAA-BBBBBBB-CCCCCCC-DDDDDDD-EEEEEEE-FFFFFFF-GGGGGGG-HHHHHHH",
        LocalDeviceName: "my-mac",
        RecordingsPath: "/home/user/data/recordings",
        NotesPath: "/home/user/data/notes",
        VaultPath: "/home/user/Obsidian Vault",
        GuiApiKey: "abcd1234");

    [TestMethod]
    public void Build_EmitsAllThreeFolders_WhenVaultPathIsProvided()
    {
        var doc = SyncthingConfigService.Build(SampleInputs);

        var ids = doc.Root!.Elements("folder").Select(f => (string)f.Attribute("id")!).ToArray();
        ids.Should().BeEquivalentTo(
            SyncthingConfigService.RecordingsFolderId,
        SyncthingConfigService.NotesFolderId,
        SyncthingConfigService.VaultFolderId);
    }

    [TestMethod]
    public void Build_OmitsVaultFolder_WhenVaultPathIsEmpty()
    {
        var inputs = SampleInputs with { VaultPath = string.Empty };

        var doc = SyncthingConfigService.Build(inputs);

        var ids = doc.Root!.Elements("folder").Select(f => (string)f.Attribute("id")!).ToArray();
        ids.Should().NotContain(SyncthingConfigService.VaultFolderId);
        ids.Should().HaveCount(2);
    }

    [TestMethod]
    public void Build_RecordingsFolder_UsesStaggeredVersioning_30Days()
    {
        var doc = SyncthingConfigService.Build(SampleInputs);

        var recordings = FindFolder(doc, SyncthingConfigService.RecordingsFolderId);
        var versioning = recordings.Element("versioning")!;

        ((string)versioning.Attribute("type")!).Should().Be("staggered");
        ReadParam(versioning, "maxAge").Should().Be((30 * 24 * 3600).ToString());
    }

    [TestMethod]
    public void Build_NotesFolder_UsesTrashcan_30DayCleanout()
    {
        var doc = SyncthingConfigService.Build(SampleInputs);

        var notes = FindFolder(doc, SyncthingConfigService.NotesFolderId);
        var versioning = notes.Element("versioning")!;

        ((string)versioning.Attribute("type")!).Should().Be("trashcan");
        ReadParam(versioning, "cleanoutDays").Should().Be("30");
    }

    [TestMethod]
    public void Build_VaultFolder_UsesTrashcan_14DayCleanout()
    {
        var doc = SyncthingConfigService.Build(SampleInputs);

        var vault = FindFolder(doc, SyncthingConfigService.VaultFolderId);
        var versioning = vault.Element("versioning")!;

        ((string)versioning.Attribute("type")!).Should().Be("trashcan");
        ReadParam(versioning, "cleanoutDays").Should().Be("14");
    }

    [TestMethod]
    public void Build_DiscoveryAndRelay_EnabledByDefault()
    {
        var doc = SyncthingConfigService.Build(SampleInputs);
        var options = doc.Root!.Element("options")!;

        options.Element("globalAnnounceEnabled")!.Value.Should().Be("true");
        options.Element("localAnnounceEnabled")!.Value.Should().Be("true");
        options.Element("relaysEnabled")!.Value.Should().Be("true");
        options.Element("natEnabled")!.Value.Should().Be("true");
        options.Element("crashReportingEnabled")!.Value.Should().Be("false");
    }

    [TestMethod]
    public void EnsureConfig_NewPath_WritesFile()
    {
        var dir = Path.Combine(Path.GetTempPath(), $"mozgoslav-cfg-{Guid.NewGuid():N}");
        var path = Path.Combine(dir, "config.xml");
        try
        {
            var service = new SyncthingConfigService(NullLogger<SyncthingConfigService>.Instance);

            var written = service.EnsureConfig(path, SampleInputs);

            written.Should().BeTrue();
            File.Exists(path).Should().BeTrue();
            var doc = XDocument.Load(path);
            doc.Root!.Elements("folder").Should().HaveCount(3);
        }
        finally
        {
            if (Directory.Exists(dir))
            {
                Directory.Delete(dir, recursive: true);
            }
        }
    }

    [TestMethod]
    public void EnsureConfig_ExistingConfig_Preserved()
    {
        var dir = Path.Combine(Path.GetTempPath(), $"mozgoslav-cfg-{Guid.NewGuid():N}");
        var path = Path.Combine(dir, "config.xml");
        try
        {
            Directory.CreateDirectory(dir);
            const string UserXml = """<?xml version="1.0" encoding="utf-8"?><configuration version="37"><!-- user-edited --></configuration>""";
            File.WriteAllText(path, UserXml);

            var service = new SyncthingConfigService(NullLogger<SyncthingConfigService>.Instance);
            var written = service.EnsureConfig(path, SampleInputs);

            written.Should().BeFalse();
            File.ReadAllText(path).Should().Be(UserXml);
        }
        finally
        {
            if (Directory.Exists(dir))
            {
                Directory.Delete(dir, recursive: true);
            }
        }
    }

    [TestMethod]
    public void GenerateApiKey_ProducesHex_OfExpectedLength()
    {
        var key = SyncthingConfigService.GenerateApiKey();
        key.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    private static XElement FindFolder(XDocument doc, string id) =>
        doc.Root!.Elements("folder").Single(e => (string)e.Attribute("id")! == id);

    private static string ReadParam(XElement versioning, string key) =>
        (string)versioning.Elements("param")
            .Single(p => (string)p.Attribute("key")! == key)
            .Attribute("val")!;
}

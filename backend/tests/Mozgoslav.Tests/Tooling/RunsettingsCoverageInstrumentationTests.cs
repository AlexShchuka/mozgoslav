using System;
using System.IO;
using System.Linq;
using System.Xml.Linq;

using FluentAssertions;

namespace Mozgoslav.Tests.Tooling;

[TestClass]
public sealed class RunsettingsCoverageInstrumentationTests
{
    private static readonly string BackendRoot = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));

    private static string UnitSettingsPath => Path.Combine(BackendRoot, "UnitTests.runsettings");

    private static string IntegrationSettingsPath => Path.Combine(BackendRoot, "IntegrationTests.runsettings");

    [TestMethod]
    public void UnitSettings_Include_contains_MozgoslavApi()
    {
        var include = ReadCoverletElement(UnitSettingsPath, "Include");
        include.Should().Contain("[Mozgoslav.Api]*");
    }

    [TestMethod]
    public void IntegrationSettings_Include_contains_MozgoslavApi()
    {
        var include = ReadCoverletElement(IntegrationSettingsPath, "Include");
        include.Should().Contain("[Mozgoslav.Api]*");
    }

    [TestMethod]
    public void UnitSettings_ExcludeByFile_excludes_obj_generated_sources()
    {
        var excludeByFile = ReadCoverletElement(UnitSettingsPath, "ExcludeByFile");
        excludeByFile.Should().Contain("**/obj/**");
    }

    [TestMethod]
    public void IntegrationSettings_ExcludeByFile_excludes_obj_generated_sources()
    {
        var excludeByFile = ReadCoverletElement(IntegrationSettingsPath, "ExcludeByFile");
        excludeByFile.Should().Contain("**/obj/**");
    }

    private static string ReadCoverletElement(string runsettingsPath, string elementName)
    {
        File.Exists(runsettingsPath).Should().BeTrue(
            $"runsettings file must exist at {runsettingsPath}");

        var doc = XDocument.Load(runsettingsPath);

        var elements = doc
            .Descendants("Configuration")
            .SelectMany(c => c.Elements(elementName))
            .ToList();

        elements.Should().NotBeEmpty(
            $"<{elementName}> must be present inside coverlet <Configuration> in {runsettingsPath}");

        return elements[0].Value;
    }
}

namespace Mozgoslav.Tests.Obsidian;

[TestClass]
public sealed class VaultDiagnosticsServiceTests
{
    [TestMethod]
    public void VaultCheck_ReportsMissing_WhenVaultPathEmpty() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void VaultCheck_ReportsMissing_WhenVaultPathDoesNotExist() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void VaultCheck_ReportsMissingObsidianDir_WhenDotObsidianAbsent() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void VaultCheck_ReportsOk_WhenVaultAndDotObsidianExist() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void PluginCheck_ReportsNotInstalled_WhenIdAbsentFromCommunityPlugins() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void PluginCheck_ReportsNotEnabled_WhenFolderMissing() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void PluginCheck_ReportsHashMismatch_WhenFilesDiffer() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void TemplaterCheck_ReportsNotConfigured_OnDefaultSettings() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void TemplaterCheck_ReportsOk_OnExpectedPreset() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void BootstrapDrift_ReportsMissing_WhenFileAbsent() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void BootstrapDrift_ReportsOutdated_WhenHashDiffers() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void BootstrapDrift_ReportsOk_WhenHashMatches() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void BootstrapDrift_RespectsUserOwned_RegardlessOfContent() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void RestApi_ReportsNotReachable_WhenTokenEmpty() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void RestApi_ReportsRequiredFalse_WhenFeatureNotEnabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void LmStudio_ReportsAdvisory_WhenUnreachable() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void RunAsync_AggregatesAllChecks_WithinSingleTimeoutBudget() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");
}

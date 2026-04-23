namespace Mozgoslav.Tests.Integration.Obsidian;

[TestClass]
public sealed class ObsidianWizardEndpointTests
{
    [TestMethod]
    public void Post_WizardStart_ReturnsInitialStateAndDiagnosticsSnapshot() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_WizardStep1_PersistsVaultPath() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_WizardStep2_InstallsPinnedPlugins_AgainstFakeAssetServer() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_WizardStep3_PollsUntilUserEnablesPlugins_OrSkipFlag() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_WizardStep4_CapturesRestTokenFromPluginDataJson() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_WizardStep5_InstallsBootstrap_AndSeedsTemplaterSettings() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void WizardIsResumable_ReentrancyLandsOnFirstNotGreenStep() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");
}

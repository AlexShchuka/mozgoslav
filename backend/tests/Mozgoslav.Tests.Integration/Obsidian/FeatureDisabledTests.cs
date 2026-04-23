namespace Mozgoslav.Tests.Integration.Obsidian;

[TestClass]
public sealed class FeatureDisabledTests
{
    [TestMethod]
    public void Post_ExportAll_Returns503_WhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_ApplyLayout_Returns503_WhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_WizardStep_Returns503_WhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_ReapplyBootstrap_Returns503_WhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Post_ReinstallPlugins_Returns503_WhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Get_Diagnostics_ReturnsOk_EvenWhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");
}

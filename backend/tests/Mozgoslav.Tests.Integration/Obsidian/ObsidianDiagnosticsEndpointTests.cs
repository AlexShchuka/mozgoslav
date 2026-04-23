namespace Mozgoslav.Tests.Integration.Obsidian;

[TestClass]
public sealed class ObsidianDiagnosticsEndpointTests
{
    [TestMethod]
    public void Get_Diagnostics_ReturnsOk_WhenFeatureDisabled() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Get_Diagnostics_ReportsEveryCheckField_InSinglePayload() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Get_Diagnostics_SnapshotIdIsUnique_PerCall() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Get_Diagnostics_RestApiCheckRequiredFalse_WhenTokenEmpty() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");

    [TestMethod]
    public void Get_Diagnostics_LmStudioCheck_IsAdvisory_NeverGatesHealth() =>
        Assert.Inconclusive("pending impl — MR2 Commit 10/14");
}

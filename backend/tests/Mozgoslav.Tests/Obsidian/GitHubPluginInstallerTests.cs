namespace Mozgoslav.Tests.Obsidian;

[TestClass]
public sealed class GitHubPluginInstallerTests
{
    [TestMethod]
    public void Install_VerifiesEveryAssetSha256_BeforeWrite() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_AbortsOnHashMismatch_NeverWritesPartialState() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_AbortsOnDownloadFailure_ReturnsDownloadFailedStatus() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_SkipsMissingOptionalAsset_StillSucceeds() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_PatchesCommunityPluginsJson_PreservesExistingIds() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_CreatesCommunityPluginsJson_WhenAbsent() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_AtomicDirectorySwap_ViaTempThenMove() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Install_ReturnsAlreadyInstalled_WhenHashesAlreadyMatch() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void EnsureRemoved_RemovesPluginFolderAndCommunityEntry() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void EnsureRemoved_IsNoOp_WhenPluginAlreadyAbsent() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");
}

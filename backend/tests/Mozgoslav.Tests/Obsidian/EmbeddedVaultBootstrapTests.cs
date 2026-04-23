namespace Mozgoslav.Tests.Obsidian;

[TestClass]
public sealed class EmbeddedVaultBootstrapTests
{
    [TestMethod]
    public void Manifest_IsLoadedFromEmbeddedResource() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Manifest_ContainsEveryShippedBootstrapFile() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void OpenReadAsync_ReturnsBytesMatchingManifestHash() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void OpenReadAsync_ThrowsForUnknownKey() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void Manifest_WritePolicy_MapsToEnumCorrectly() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");
}

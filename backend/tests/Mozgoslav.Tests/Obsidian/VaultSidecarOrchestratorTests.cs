namespace Mozgoslav.Tests.Obsidian;

[TestClass]
public sealed class VaultSidecarOrchestratorTests
{
    [TestMethod]
    public void ApplyAsync_InstallsPlugins_ThenBootstrap_ThenDiagnoses() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void ApplyAsync_IsIdempotent_OnSecondRun() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void ApplyAsync_PropagatesPluginInstallFailure_IntoDiagnostics() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void ApplyAsync_PropagatesBootstrapDriverFailure_IntoDiagnostics() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");

    [TestMethod]
    public void ApplyAsync_RespectsCancellation_BetweenSteps() =>
        Assert.Inconclusive("pending impl — MR2 Commit 6/14");
}

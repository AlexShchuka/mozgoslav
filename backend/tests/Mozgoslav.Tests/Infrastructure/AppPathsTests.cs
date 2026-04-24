using System.IO;

using FluentAssertions;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class AppPathsTests
{
    [TestMethod]
    public void ResolveBundledOrUserModel_returns_user_dir_path_when_bundle_is_empty()
    {
        var result = AppPaths.ResolveBundledOrUserModel(
            filename: "ggml-small-q8_0.bin",
            bundleDir: string.Empty,
            userModelsDir: "/home/shuka/.local/mozgoslav/models");

        result.Should().Be(Path.Combine("/home/shuka/.local/mozgoslav/models", "ggml-small-q8_0.bin"));
    }

    [TestMethod]
    public void ResolveBundledOrUserModel_returns_bundle_dir_path_when_bundle_set()
    {
        var result = AppPaths.ResolveBundledOrUserModel(
            filename: "ggml-small-q8_0.bin",
            bundleDir: "/Applications/Mozgoslav.app/Contents/Resources/bundle-models",
            userModelsDir: "/home/shuka/.local/mozgoslav/models");

        result.Should().Be(Path.Combine(
            "/Applications/Mozgoslav.app/Contents/Resources/bundle-models",
            "ggml-small-q8_0.bin"));
    }

    [TestMethod]
    public void DefaultWhisperModelPath_filename_is_Tier1_bundled_small_q8()
    {
        Path.GetFileName(AppPaths.DefaultWhisperModelPath)
            .Should().Be("ggml-small-q8_0.bin");
    }

    [TestMethod]
    public void DefaultVadModelPath_filename_is_Silero_v620()
    {
        Path.GetFileName(AppPaths.DefaultVadModelPath)
            .Should().Be("ggml-silero-v6.2.0.bin");
    }
}

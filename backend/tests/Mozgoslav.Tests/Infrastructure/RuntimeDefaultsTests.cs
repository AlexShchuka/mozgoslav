using System;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Seed;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// Task #12 — first-run defaults for Whisper/VAD/Vault. Tests inject a stub
/// <see cref="Func{TResult}"/> for <c>Directory.Exists</c> so they stay
/// hermetic and parallelisable — no filesystem side effects.
/// </summary>
[TestClass]
public sealed class RuntimeDefaultsTests
{
    private static AppSettingsDto EmptySettings() => AppSettingsDto.Defaults with
    {
        WhisperModelPath = string.Empty,
        VadModelPath = string.Empty,
        VaultPath = string.Empty,
    };

    private static readonly Func<string, bool> NothingExists = _ => false;
    private static readonly Func<string, bool> EverythingExists = _ => true;

    [TestMethod]
    public void Apply_fills_WhisperModelPath_from_AppPaths_when_empty()
    {
        var output = RuntimeDefaults.Apply(EmptySettings(), NothingExists);

        output.WhisperModelPath.Should().Be(AppPaths.DefaultWhisperModelPath);
    }

    [TestMethod]
    public void Apply_preserves_user_WhisperModelPath_when_set()
    {
        var input = EmptySettings() with { WhisperModelPath = "/Users/shuka/custom-model.bin" };

        var output = RuntimeDefaults.Apply(input, NothingExists);

        output.WhisperModelPath.Should().Be("/Users/shuka/custom-model.bin");
    }

    [TestMethod]
    public void Apply_fills_VadModelPath_from_AppPaths_when_empty()
    {
        var output = RuntimeDefaults.Apply(EmptySettings(), NothingExists);

        output.VadModelPath.Should().Be(AppPaths.DefaultVadModelPath);
    }

    [TestMethod]
    public void Apply_fills_VaultPath_when_empty_and_DefaultVaultPath_directory_exists()
    {
        static bool OnlyDefaultVaultExists(string path)
        {
            return path == AppPaths.DefaultVaultPath;
        }

        var output = RuntimeDefaults.Apply(EmptySettings(), OnlyDefaultVaultExists);

        output.VaultPath.Should().Be(AppPaths.DefaultVaultPath);
    }

    [TestMethod]
    public void Apply_leaves_VaultPath_empty_when_DefaultVaultPath_does_not_exist()
    {
        var output = RuntimeDefaults.Apply(EmptySettings(), NothingExists);

        output.VaultPath.Should().BeEmpty(
            "Never silently point at a non-existent vault — user must pick one explicitly");
    }

    [TestMethod]
    public void Apply_preserves_user_VaultPath_when_set_even_if_missing_on_disk()
    {
        var input = EmptySettings() with { VaultPath = "/Users/shuka/planned/vault" };

        var output = RuntimeDefaults.Apply(input, NothingExists);

        output.VaultPath.Should().Be("/Users/shuka/planned/vault");
    }

    [TestMethod]
    public void Apply_does_not_override_user_VaultPath_when_default_also_exists()
    {
        var input = EmptySettings() with { VaultPath = "/Users/shuka/custom/vault" };

        var output = RuntimeDefaults.Apply(input, EverythingExists);

        output.VaultPath.Should().Be("/Users/shuka/custom/vault");
    }
}

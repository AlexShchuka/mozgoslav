using FluentAssertions;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class AppSettingsDefaultsTests
{
    [TestMethod]
    public void Defaults_VaultPath_IsEmpty()
        => AppSettingsDto.Defaults.VaultPath.Should().BeEmpty();

    [TestMethod]
    public void Defaults_LlmProvider_IsOpenAiCompatible()
        => AppSettingsDto.Defaults.LlmProvider.Should().Be("openai_compatible");

    [TestMethod]
    public void Defaults_LlmEndpoint_IsLocalhost1234()
        => AppSettingsDto.Defaults.LlmEndpoint.Should().Be("http://localhost:1234");

    [TestMethod]
    public void Defaults_LlmModel_IsDefault()
        => AppSettingsDto.Defaults.LlmModel.Should().Be("default");

    [TestMethod]
    public void Defaults_Language_IsRussian()
        => AppSettingsDto.Defaults.Language.Should().Be("ru");

    [TestMethod]
    public void Defaults_ThemeMode_IsSystem()
        => AppSettingsDto.Defaults.ThemeMode.Should().Be("system");

    [TestMethod]
    public void Defaults_WhisperThreads_IsZero()
        => AppSettingsDto.Defaults.WhisperThreads.Should().Be(0);

    [TestMethod]
    public void Defaults_DictationEnabled_IsTrue()
        => AppSettingsDto.Defaults.DictationEnabled.Should().BeTrue();

    [TestMethod]
    public void Defaults_DictationMouseButton_IsFive()
        => AppSettingsDto.Defaults.DictationMouseButton.Should().Be(5);

    [TestMethod]
    public void Defaults_DictationCaptureSampleRate_Is48000()
        => AppSettingsDto.Defaults.DictationCaptureSampleRate.Should().Be(48000);

    [TestMethod]
    public void Defaults_DictationHotkeyType_IsMouse()
        => AppSettingsDto.Defaults.DictationHotkeyType.Should().Be("mouse");

    [TestMethod]
    public void Defaults_DictationKeyboardHotkey_IsRightOption()
        => AppSettingsDto.Defaults.DictationKeyboardHotkey.Should().Be("Right-Option");

    [TestMethod]
    public void Defaults_DictationLanguage_IsRussian()
        => AppSettingsDto.Defaults.DictationLanguage.Should().Be("ru");

    [TestMethod]
    public void Defaults_DictationWhisperModelId_IsExpected()
        => AppSettingsDto.Defaults.DictationWhisperModelId.Should().Be("whisper-large-v3-russian-antony66");

    [TestMethod]
    public void Defaults_DictationLlmPolish_IsFalse()
        => AppSettingsDto.Defaults.DictationLlmPolish.Should().BeFalse();

    [TestMethod]
    public void Defaults_DictationInjectMode_IsAuto()
        => AppSettingsDto.Defaults.DictationInjectMode.Should().Be("auto");

    [TestMethod]
    public void Defaults_DictationOverlayEnabled_IsTrue()
        => AppSettingsDto.Defaults.DictationOverlayEnabled.Should().BeTrue();

    [TestMethod]
    public void Defaults_DictationOverlayPosition_IsCursor()
        => AppSettingsDto.Defaults.DictationOverlayPosition.Should().Be("cursor");

    [TestMethod]
    public void Defaults_DictationSoundFeedback_IsTrue()
        => AppSettingsDto.Defaults.DictationSoundFeedback.Should().BeTrue();

    [TestMethod]
    public void Defaults_DictationModelUnloadMinutes_IsTen()
        => AppSettingsDto.Defaults.DictationModelUnloadMinutes.Should().Be(10);

    [TestMethod]
    public void Defaults_SyncthingEnabled_IsTrue()
        => AppSettingsDto.Defaults.SyncthingEnabled.Should().BeTrue();

    [TestMethod]
    public void Defaults_DictationPushToTalk_IsTrue()
        => AppSettingsDto.Defaults.DictationPushToTalk.Should().BeTrue();

    [TestMethod]
    public void Defaults_ObsidianFeatureEnabled_IsFalse()
        => AppSettingsDto.Defaults.ObsidianFeatureEnabled.Should().BeFalse();

    [TestMethod]
    public void Defaults_DictationDumpEnabled_IsFalse()
        => AppSettingsDto.Defaults.DictationDumpEnabled.Should().BeFalse();

    [TestMethod]
    public void Defaults_WebCacheTtlHours_Is24()
        => AppSettingsDto.Defaults.WebCacheTtlHours.Should().Be(24);

    [TestMethod]
    public void Defaults_McpServerEnabled_IsFalse()
        => AppSettingsDto.Defaults.McpServerEnabled.Should().BeFalse();

    [TestMethod]
    public void Defaults_McpServerPort_Is51051()
        => AppSettingsDto.Defaults.McpServerPort.Should().Be(51051);

    [TestMethod]
    public void Defaults_SidecarEnrichmentEnabled_IsFalse()
        => AppSettingsDto.Defaults.SidecarEnrichmentEnabled.Should().BeFalse();

    [TestMethod]
    public void Defaults_ActionsSkillEnabled_IsFalse()
        => AppSettingsDto.Defaults.ActionsSkillEnabled.Should().BeFalse();

    [TestMethod]
    public void Defaults_RemindersSkillEnabled_IsFalse()
        => AppSettingsDto.Defaults.RemindersSkillEnabled.Should().BeFalse();

    [TestMethod]
    public void Defaults_DictationClassifyIntentEnabled_IsFalse()
        => AppSettingsDto.Defaults.DictationClassifyIntentEnabled.Should().BeFalse();
}

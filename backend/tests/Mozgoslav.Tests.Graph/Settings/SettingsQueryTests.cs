using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Settings;

[TestClass]
public sealed class SettingsQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Settings_ReturnsAllFields()
    {
        var result = await ExecuteAsync(@"
{
  settings {
    vaultPath
    llmProvider
    language
    themeMode
    dictationEnabled
    syncthingEnabled
  }
}");

        result["data"]!["settings"].Should().NotBeNull();
        result["data"]!["settings"]!["language"]!.GetValue<string>().Should().Be("ru");
    }

    [TestMethod]
    public async Task UpdateSettings_SavesAndReturnsUpdated()
    {
        var result = await ExecuteAsync(@"
mutation {
  updateSettings(input: {
    vaultPath: ""/tmp/vault""
    llmProvider: ""openai_compatible""
    llmEndpoint: ""http://localhost:1234""
    llmModel: ""default""
    llmApiKey: """"
    obsidianApiHost: ""http://127.0.0.1:27123""
    obsidianApiToken: """"
    whisperModelPath: """"
    vadModelPath: """"
    language: ""en""
    themeMode: ""dark""
    whisperThreads: 0
    dictationEnabled: true
    dictationHotkeyType: ""mouse""
    dictationMouseButton: 5
    dictationKeyboardHotkey: ""Right-Option""
    dictationLanguage: ""ru""
    dictationWhisperModelId: ""whisper-large-v3-russian-antony66""
    dictationCaptureSampleRate: 48000
    dictationLlmPolish: false
    dictationInjectMode: ""auto""
    dictationOverlayEnabled: true
    dictationOverlayPosition: ""cursor""
    dictationSoundFeedback: true
    dictationVocabulary: []
    dictationModelUnloadMinutes: 10
    dictationTempAudioPath: """"
    dictationAppProfiles: []
    syncthingEnabled: false
    syncthingObsidianVaultPath: """"
    syncthingApiKey: """"
    syncthingBaseUrl: """"
  }) {
    settings {
      language
      themeMode
      vaultPath
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["updateSettings"]!["settings"]!["language"]!.GetValue<string>().Should().Be("en");
        result["data"]!["updateSettings"]!["settings"]!["themeMode"]!.GetValue<string>().Should().Be("dark");
        result["data"]!["updateSettings"]!["errors"]!.AsArray().Should().BeEmpty();
    }
}

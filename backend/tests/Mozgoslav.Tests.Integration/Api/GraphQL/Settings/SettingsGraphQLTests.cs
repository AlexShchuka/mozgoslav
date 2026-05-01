using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Settings;

[TestClass]
public sealed class SettingsGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task SettingsQuery_ReturnsShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  settings {
                    vaultPath llmProvider llmEndpoint llmModel language themeMode
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["data"]!["settings"].Should().NotBeNull();
        json["data"]!["settings"]!["vaultPath"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task UpdateSettingsMutation_ValidInput_ReturnsSavedSettings()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: UpdateSettingsInput!) {
                  updateSettings(input: $input) {
                    settings { vaultPath llmProvider llmModel language }
                    errors { code message }
                  }
                }
                """,
            variables = new
            {
                input = new
                {
                    vaultPath = "/tmp/vault",
                    llmProvider = "openai",
                    llmEndpoint = "http://localhost:11434",
                    llmModel = "gpt-4",
                    llmApiKey = "",
                    obsidianApiHost = "",
                    obsidianApiToken = "",
                    whisperModelPath = "",
                    vadModelPath = "",
                    language = "en",
                    themeMode = "dark",
                    whisperThreads = 4,
                    dictationEnabled = false,
                    dictationHotkeyType = "keyboard",
                    dictationMouseButton = 0,
                    dictationKeyboardHotkey = "",
                    dictationLanguage = "en",
                    dictationWhisperModelId = "",
                    dictationCaptureSampleRate = 16000,
                    dictationLlmPolish = false,
                    dictationInjectMode = "clipboard",
                    dictationOverlayEnabled = false,
                    dictationOverlayPosition = "bottom-right",
                    dictationSoundFeedback = false,
                    dictationVocabulary = System.Array.Empty<string>(),
                    dictationModelUnloadMinutes = 5,
                    dictationTempAudioPath = "",
                    dictationAppProfiles = System.Array.Empty<object>(),
                    syncthingEnabled = false,
                    syncthingObsidianVaultPath = "",
                    syncthingApiKey = "",
                    syncthingBaseUrl = ""
                }
            }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["errors"];
        errors.Should().BeNull();
        var settings = json["data"]!["updateSettings"]!["settings"];
        settings.Should().NotBeNull();
        settings!["vaultPath"]!.GetValue<string>().Should().Be("/tmp/vault");
    }

    [TestMethod]
    public async Task LlmModelsQuery_ReturnsArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  llmModels { id ownedBy contextLength }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["data"]!["llmModels"].Should().NotBeNull();
        json["data"]!["llmModels"]!.AsArray().Should().NotBeNull();
    }
}

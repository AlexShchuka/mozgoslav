using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007-shared §2.6 BC-025 — Obsidian bulk export + PARA layout endpoints.
/// Contract:
///   POST /api/obsidian/export-all    → { exportedCount, skippedCount, failures:[{noteId, reason}] }
///   POST /api/obsidian/apply-layout  → { createdFolders, movedNotes }
/// </summary>
[TestClass]
public sealed class ObsidianBulkExportTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Post_ExportAll_NoVaultConfigured_ReturnsBadRequest()
    {
        // When no vault is set, the export-all endpoint cannot do anything
        // useful — surface a 400 so the frontend can prompt the user to
        // configure the vault path instead of silently returning 0/0.
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync(
            "/api/obsidian/export-all",
            content: null,
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Post_ExportAll_WithVaultAndOneUnexportedNote_ExportsAndReportsCount()
    {
        var vaultDir = Path.Combine(Path.GetTempPath(), $"mozgoslav-vault-{Guid.NewGuid():N}");
        Directory.CreateDirectory(vaultDir);
        try
        {
            await using var factory = new ApiFactory();
            using (var scope = factory.Services.CreateScope())
            {
                var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
                await settings.SaveAsync(settings.Snapshot with { VaultPath = vaultDir }, TestContext.CancellationToken);

                var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
                var transcripts = scope.ServiceProvider.GetRequiredService<ITranscriptRepository>();
                var recordings = scope.ServiceProvider.GetRequiredService<IRecordingRepository>();
                var profiles = scope.ServiceProvider.GetRequiredService<IProfileRepository>();

                var profile = (await profiles.GetAllAsync(TestContext.CancellationToken))[0];
                var recording = new Recording
                {
                    FileName = "x.wav",
                    FilePath = "/tmp/x.wav",
                    Sha256 = Guid.NewGuid().ToString("N"),
                    Format = AudioFormat.Wav,
                    SourceType = SourceType.Imported,
                    Status = RecordingStatus.Transcribed,
                    Duration = TimeSpan.FromSeconds(1),
                };
                await recordings.AddAsync(recording, TestContext.CancellationToken);
                var transcript = new Transcript
                {
                    RecordingId = recording.Id,
                    ModelUsed = "t",
                    Language = "ru",
                    RawText = "r",
                };
                await transcripts.AddAsync(transcript, TestContext.CancellationToken);
                await notes.AddAsync(new ProcessedNote
                {
                    TranscriptId = transcript.Id,
                    ProfileId = profile.Id,
                    Topic = "hello",
                    MarkdownContent = "# hello\n\nbody",
                }, TestContext.CancellationToken);
            }

            using var client = factory.CreateClient();
            using var response = await client.PostAsync(
                "/api/obsidian/export-all",
                content: null,
                TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
            payload.GetProperty("exportedCount").GetInt32().Should().Be(1);
            payload.GetProperty("skippedCount").GetInt32().Should().Be(0);
            payload.GetProperty("failures").ValueKind.Should().Be(JsonValueKind.Array);
            payload.GetProperty("failures").GetArrayLength().Should().Be(0);

            // Running again should now skip (already exported) and not re-export.
            using var second = await client.PostAsync(
                "/api/obsidian/export-all",
                content: null,
                TestContext.CancellationToken);
            var secondPayload = await second.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
            secondPayload.GetProperty("exportedCount").GetInt32().Should().Be(0);
            secondPayload.GetProperty("skippedCount").GetInt32().Should().Be(1);
        }
        finally
        {
            if (Directory.Exists(vaultDir))
            {
                try { Directory.Delete(vaultDir, recursive: true); } catch { /* best effort */ }
            }
        }
    }

    [TestMethod]
    public async Task Post_ApplyLayout_CreatesParaFolders_ReturnsCreatedCount()
    {
        var vaultDir = Path.Combine(Path.GetTempPath(), $"mozgoslav-vault-{Guid.NewGuid():N}");
        Directory.CreateDirectory(vaultDir);
        try
        {
            await using var factory = new ApiFactory();
            using (var scope = factory.Services.CreateScope())
            {
                var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
                await settings.SaveAsync(settings.Snapshot with { VaultPath = vaultDir }, TestContext.CancellationToken);
            }

            using var client = factory.CreateClient();
            using var response = await client.PostAsync(
                "/api/obsidian/apply-layout",
                content: null,
                TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
            payload.GetProperty("createdFolders").GetInt32().Should().BeGreaterThanOrEqualTo(1);
            payload.GetProperty("movedNotes").GetInt32().Should().BeGreaterThanOrEqualTo(0);

            // Idempotent: calling a second time creates 0 folders.
            using var second = await client.PostAsync(
                "/api/obsidian/apply-layout",
                content: null,
                TestContext.CancellationToken);
            var secondPayload = await second.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
            secondPayload.GetProperty("createdFolders").GetInt32().Should().Be(0);
        }
        finally
        {
            if (Directory.Exists(vaultDir))
            {
                try { Directory.Delete(vaultDir, recursive: true); } catch { /* best effort */ }
            }
        }
    }

    public TestContext TestContext { get; set; } = null!;
}

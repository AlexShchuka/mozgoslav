using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Integration.Rag;

[TestClass]
public sealed class RagEndpointsContractTests : IntegrationTestsBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Reindex_EmptyDb_ReturnsEmbeddedNotesAndChunksShape()
    {
        using var client = CreateClient();

        using var response = await client.PostAsync("/api/rag/reindex", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);

        payload.TryGetProperty("embeddedNotes", out var embedded).Should().BeTrue(
            "ADR-007-shared §2.4 fixes the reindex response as {embeddedNotes, chunks}");
        embedded.GetInt32().Should().Be(0);

        payload.TryGetProperty("chunks", out var chunks).Should().BeTrue();
        chunks.GetInt32().Should().Be(0);
    }

    [TestMethod]
    public async Task Query_EmptyIndex_ReturnsAnswerAndEmptyCitationsArray()
    {
        using var client = CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/rag/query",
            new { question = "anything", topK = 3 },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);

        payload.TryGetProperty("answer", out var answer).Should().BeTrue();
        answer.ValueKind.Should().Be(JsonValueKind.String);

        payload.TryGetProperty("citations", out var citations).Should().BeTrue();
        citations.ValueKind.Should().Be(JsonValueKind.Array);
        citations.GetArrayLength().Should().Be(0);
    }

    [TestMethod]
    public async Task Query_MissingQuestion_ReturnsBadRequest()
    {
        using var client = CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/rag/query",
            new { question = string.Empty },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [TestMethod]
    public async Task Query_DefaultTopK_IsFive_WhenNotProvided()
    {
        using var client = CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/rag/query",
            new { question = "ping" },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
        payload.GetProperty("citations").GetArrayLength().Should().BeLessThanOrEqualTo(5);
    }

    [TestMethod]
    public async Task Query_WithSeededNote_ReturnsCitationShape_NoteId_SegmentId_Text_Snippet()
    {
        Guid seededNoteId;
        using (var scope = Factory.Services.CreateScope())
        {
            var profiles = scope.ServiceProvider.GetRequiredService<IProfileRepository>();
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
            var transcripts = scope.ServiceProvider.GetRequiredService<ITranscriptRepository>();
            var recordings = scope.ServiceProvider.GetRequiredService<IRecordingRepository>();

            var profile = (await profiles.GetAllAsync(TestContext.CancellationToken))[0];
            var recording = new Recording
            {
                FileName = "g.wav",
                FilePath = "/tmp/g.wav",
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
                ModelUsed = "test",
                Language = "ru",
                RawText = "body",
            };
            await transcripts.AddAsync(transcript, TestContext.CancellationToken);
            var note = new ProcessedNote
            {
                TranscriptId = transcript.Id,
                ProfileId = profile.Id,
                MarkdownContent = "Настроил Syncthing: парная пара с телефоном через QR-код. Всё работает.",
            };
            await notes.AddAsync(note, TestContext.CancellationToken);
            seededNoteId = note.Id;
        }

        using var client = CreateClient();
        using (var r = await client.PostAsync("/api/rag/reindex", content: null, TestContext.CancellationToken))
        {
            r.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        using var response = await client.PostAsJsonAsync(
            "/api/rag/query",
            new { question = "Syncthing QR", topK = 3 },
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);

        payload.GetProperty("answer").ValueKind.Should().Be(JsonValueKind.String);
        var citations = payload.GetProperty("citations");
        citations.ValueKind.Should().Be(JsonValueKind.Array);
        citations.GetArrayLength().Should().BeGreaterThan(0);

        var first = citations[0];
        first.TryGetProperty("noteId", out var noteIdProp).Should().BeTrue("§2.4 citations[].noteId");
        first.TryGetProperty("segmentId", out var segIdProp).Should().BeTrue("§2.4 citations[].segmentId");
        first.TryGetProperty("text", out var textProp).Should().BeTrue("§2.4 citations[].text");
        first.TryGetProperty("snippet", out var snippetProp).Should().BeTrue("§2.4 citations[].snippet");

        noteIdProp.GetString().Should().NotBeNullOrEmpty();
        segIdProp.GetString().Should().NotBeNullOrEmpty();
        textProp.GetString().Should().NotBeNullOrEmpty();
        snippetProp.GetString().Should().NotBeNullOrEmpty();

        Guid.Parse(noteIdProp.GetString()!).Should().Be(seededNoteId);
    }

    [TestMethod]
    public async Task Reindex_AfterSeedingNotes_CountsMatchContractFields()
    {
        using (var scope = Factory.Services.CreateScope())
        {
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
            var transcripts = scope.ServiceProvider.GetRequiredService<ITranscriptRepository>();
            var recordings = scope.ServiceProvider.GetRequiredService<IRecordingRepository>();
            var profiles = scope.ServiceProvider.GetRequiredService<IProfileRepository>();

            var profile = (await profiles.GetAllAsync(TestContext.CancellationToken))[0];
            var recording = new Recording
            {
                FileName = "f.wav",
                FilePath = "/tmp/f.wav",
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
                ModelUsed = "test",
                Language = "ru",
                RawText = "body",
            };
            await transcripts.AddAsync(transcript, TestContext.CancellationToken);
            var note = new ProcessedNote
            {
                TranscriptId = transcript.Id,
                ProfileId = profile.Id,
                MarkdownContent = "Пара предложений про синхронизацию Obsidian.",
            };
            await notes.AddAsync(note, TestContext.CancellationToken);
        }

        using var client = CreateClient();
        using var response = await client.PostAsync("/api/rag/reindex", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(Json, TestContext.CancellationToken);
        payload.GetProperty("embeddedNotes").GetInt32().Should().Be(1);
        payload.GetProperty("chunks").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }
}

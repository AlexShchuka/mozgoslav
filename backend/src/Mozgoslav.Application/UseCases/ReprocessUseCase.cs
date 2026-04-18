using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Application.UseCases;

/// <summary>
/// Re-processes an existing Recording through a different Profile without
/// re-running STT. Takes the latest Transcript and produces a new ProcessedNote
/// with a bumped version number, preserving the source audio and all prior
/// interpretations.
/// </summary>
public sealed class ReprocessUseCase
{
    private readonly IRecordingRepository _recordings;
    private readonly ITranscriptRepository _transcripts;
    private readonly IProcessedNoteRepository _notes;
    private readonly IProfileRepository _profiles;
    private readonly ILlmService _llmService;
    private readonly IMarkdownExporter _exporter;
    private readonly CorrectionService _correctionService;
    private readonly IAppSettings _settings;

    public ReprocessUseCase(
        IRecordingRepository recordings,
        ITranscriptRepository transcripts,
        IProcessedNoteRepository notes,
        IProfileRepository profiles,
        ILlmService llmService,
        IMarkdownExporter exporter,
        CorrectionService correctionService,
        IAppSettings settings)
    {
        _recordings = recordings;
        _transcripts = transcripts;
        _notes = notes;
        _profiles = profiles;
        _llmService = llmService;
        _exporter = exporter;
        _correctionService = correctionService;
        _settings = settings;
    }

    public async Task<ProcessedNote> ExecuteAsync(Guid recordingId, Guid profileId, CancellationToken ct)
    {
        var recording = await _recordings.GetByIdAsync(recordingId, ct)
            ?? throw new InvalidOperationException($"Recording {recordingId} not found");
        var profile = await _profiles.GetByIdAsync(profileId, ct)
            ?? throw new InvalidOperationException($"Profile {profileId} not found");
        var transcript = await _transcripts.GetByRecordingIdAsync(recordingId, ct)
            ?? throw new InvalidOperationException(
                $"No transcript found for recording {recordingId}. Transcribe it first before reprocessing.");

        var cleanText = _correctionService.Correct(transcript.RawText, profile);

        LlmProcessingResult? llm = null;
        if (await _llmService.IsAvailableAsync(ct))
        {
            llm = await _llmService.ProcessAsync(cleanText, profile.SystemPrompt, ct);
        }

        var existingForTranscript = await _notes.GetByTranscriptIdAsync(transcript.Id, ct);
        var version = existingForTranscript.Count == 0 ? 1 : existingForTranscript.Max(n => n.Version) + 1;

        var note = new ProcessedNote
        {
            TranscriptId = transcript.Id,
            ProfileId = profile.Id,
            Version = version,
            Summary = llm?.Summary ?? string.Empty,
            KeyPoints = llm?.KeyPoints.ToList() ?? [],
            Decisions = llm?.Decisions.ToList() ?? [],
            ActionItems = llm?.ActionItems.ToList() ?? [],
            UnresolvedQuestions = llm?.UnresolvedQuestions.ToList() ?? [],
            Participants = llm?.Participants.ToList() ?? [],
            Topic = llm?.Topic ?? Path.GetFileNameWithoutExtension(recording.FileName),
            ConversationType = llm?.ConversationType ?? ConversationType.Other,
            CleanTranscript = cleanText,
            FullTranscript = transcript.RawText,
            Tags = llm?.Tags.ToList() ?? []
        };
        note.MarkdownContent = MarkdownGenerator.Generate(note, profile, recording, transcript.Segments);

        if (!string.IsNullOrWhiteSpace(_settings.VaultPath))
        {
            try
            {
                note.VaultPath = await _exporter.ExportAsync(note, profile, _settings.VaultPath, ct);
                note.ExportedToVault = true;
            }
            catch
            {
                // Export failure shouldn't block creating the note — user can retry from the note viewer.
            }
        }

        await _notes.AddAsync(note, ct);
        return note;
    }
}

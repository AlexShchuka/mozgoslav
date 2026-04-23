using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Infrastructure.Persistence;

/// <summary>
/// EF Core DbContext for Mozgoslav. Follows the team C# service pattern:
/// thin entity configurations, enums stored as strings, collections/value objects
/// stored as JSON via value converters. Schema is created via
/// <c>DatabaseFacade.EnsureCreated()</c> during startup.
/// </summary>
public sealed class MozgoslavDbContext : DbContext
{
    public MozgoslavDbContext(DbContextOptions<MozgoslavDbContext> options) : base(options)
    {
    }

    public DbSet<Recording> Recordings => Set<Recording>();
    public DbSet<Transcript> Transcripts => Set<Transcript>();
    public DbSet<ProcessedNote> ProcessedNotes => Set<ProcessedNote>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<ProcessingJob> ProcessingJobs => Set<ProcessingJob>();
    public DbSet<AppSetting> Settings => Set<AppSetting>();
    public DbSet<RagChunk> RagChunks => Set<RagChunk>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var stringListConverter = new ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v ?? new List<string>(), (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

        var actionItemListConverter = new ValueConverter<List<ActionItem>, string>(
            v => JsonSerializer.Serialize(v ?? new List<ActionItem>(), (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<ActionItem>>(v, (JsonSerializerOptions?)null) ?? new List<ActionItem>());

        var segmentListConverter = new ValueConverter<List<TranscriptSegment>, string>(
            v => JsonSerializer.Serialize(v ?? new List<TranscriptSegment>(), (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<TranscriptSegment>>(v, (JsonSerializerOptions?)null) ?? new List<TranscriptSegment>());

        var stringListComparer = new ValueComparer<List<string>>(
            (l, r) => (l ?? new List<string>()).SequenceEqual(r ?? new List<string>()),
            v => v == null ? 0 : v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s == null ? 0 : s.GetHashCode(StringComparison.Ordinal))),
            v => v == null ? new List<string>() : v.ToList());

        var actionItemListComparer = new ValueComparer<List<ActionItem>>(
            (l, r) => (l ?? new List<ActionItem>()).SequenceEqual(r ?? new List<ActionItem>()),
            v => v == null ? 0 : v.Aggregate(0, (acc, i) => HashCode.Combine(acc, i == null ? 0 : i.GetHashCode())),
            v => v == null ? new List<ActionItem>() : v.ToList());

        var segmentListComparer = new ValueComparer<List<TranscriptSegment>>(
            (l, r) => (l ?? new List<TranscriptSegment>()).SequenceEqual(r ?? new List<TranscriptSegment>()),
            v => v == null ? 0 : v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s == null ? 0 : s.GetHashCode())),
            v => v == null ? new List<TranscriptSegment>() : v.ToList());

        modelBuilder.Entity<Recording>(e =>
        {
            e.ToTable("recordings");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.FileName).HasColumnName("file_name").IsRequired();
            e.Property(x => x.FilePath).HasColumnName("file_path").IsRequired();
            e.Property(x => x.Sha256).HasColumnName("sha256").IsRequired();
            e.Property(x => x.Duration).HasColumnName("duration_ms")
                .HasConversion(v => (long)v.TotalMilliseconds, v => TimeSpan.FromMilliseconds(v));
            e.Property(x => x.Format).HasColumnName("format").HasConversion<string>().IsRequired();
            e.Property(x => x.SourceType).HasColumnName("source_type").HasConversion<string>().IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.Sha256);
            e.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<Transcript>(e =>
        {
            e.ToTable("transcripts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RecordingId).HasColumnName("recording_id");
            e.Property(x => x.ModelUsed).HasColumnName("model_used").IsRequired();
            e.Property(x => x.Language).HasColumnName("language").IsRequired();
            e.Property(x => x.RawText).HasColumnName("raw_text").IsRequired();
            var segmentsProperty = e.Property(x => x.Segments).HasColumnName("segments_json")
                .HasConversion(segmentListConverter)
                .HasColumnType("TEXT");
            segmentsProperty.Metadata.SetValueComparer(segmentListComparer);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.RecordingId);
        });

        modelBuilder.Entity<ProcessedNote>(e =>
        {
            e.ToTable("processed_notes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TranscriptId).HasColumnName("transcript_id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.Source).HasColumnName("source").HasConversion<string>().IsRequired();
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.Summary).HasColumnName("summary");
            var keyPointsProperty = e.Property(x => x.KeyPoints).HasColumnName("key_points_json").HasConversion(stringListConverter);
            keyPointsProperty.Metadata.SetValueComparer(stringListComparer);
            var decisionsProperty = e.Property(x => x.Decisions).HasColumnName("decisions_json").HasConversion(stringListConverter);
            decisionsProperty.Metadata.SetValueComparer(stringListComparer);
            var actionItemsProperty = e.Property(x => x.ActionItems).HasColumnName("action_items_json").HasConversion(actionItemListConverter);
            actionItemsProperty.Metadata.SetValueComparer(actionItemListComparer);
            var unresolvedProperty = e.Property(x => x.UnresolvedQuestions).HasColumnName("unresolved_questions_json").HasConversion(stringListConverter);
            unresolvedProperty.Metadata.SetValueComparer(stringListComparer);
            var participantsProperty = e.Property(x => x.Participants).HasColumnName("participants_json").HasConversion(stringListConverter);
            participantsProperty.Metadata.SetValueComparer(stringListComparer);
            e.Property(x => x.Topic).HasColumnName("topic");
            e.Property(x => x.ConversationType).HasColumnName("conversation_type").HasConversion<string>();
            e.Property(x => x.CleanTranscript).HasColumnName("clean_transcript");
            e.Property(x => x.FullTranscript).HasColumnName("full_transcript");
            var tagsProperty = e.Property(x => x.Tags).HasColumnName("tags_json").HasConversion(stringListConverter);
            tagsProperty.Metadata.SetValueComparer(stringListComparer);
            e.Property(x => x.MarkdownContent).HasColumnName("markdown_content");
            e.Property(x => x.ExportedToVault).HasColumnName("exported_to_vault");
            e.Property(x => x.VaultPath).HasColumnName("vault_path");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.TranscriptId);
        });

        modelBuilder.Entity<Profile>(e =>
        {
            e.ToTable("profiles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").IsRequired();
            e.Property(x => x.SystemPrompt).HasColumnName("system_prompt").IsRequired();
            e.Property(x => x.TranscriptionPromptOverride).HasColumnName("transcription_prompt_override");
            e.Property(x => x.OutputTemplate).HasColumnName("output_template");
            e.Property(x => x.CleanupLevel).HasColumnName("cleanup_level").HasConversion<string>().IsRequired();
            e.Property(x => x.ExportFolder).HasColumnName("export_folder").IsRequired();
            var autoTagsProperty = e.Property(x => x.AutoTags).HasColumnName("auto_tags_json").HasConversion(stringListConverter);
            autoTagsProperty.Metadata.SetValueComparer(stringListComparer);
            e.Property(x => x.IsDefault).HasColumnName("is_default");
            e.Property(x => x.IsBuiltIn).HasColumnName("is_built_in");
            var glossaryProperty = e.Property(x => x.Glossary).HasColumnName("glossary_json").HasConversion(stringListConverter);
            glossaryProperty.Metadata.SetValueComparer(stringListComparer);
            e.Property(x => x.LlmCorrectionEnabled).HasColumnName("llm_correction_enabled");
        });

        modelBuilder.Entity<ProcessingJob>(e =>
        {
            e.ToTable("processing_jobs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RecordingId).HasColumnName("recording_id");
            e.Property(x => x.ProfileId).HasColumnName("profile_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().IsRequired();
            e.Property(x => x.Progress).HasColumnName("progress");
            e.Property(x => x.CurrentStep).HasColumnName("current_step");
            e.Property(x => x.ErrorMessage).HasColumnName("error_message");
            e.Property(x => x.UserHint).HasColumnName("user_hint");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.FinishedAt).HasColumnName("finished_at");
            e.Property(x => x.CancelRequested).HasColumnName("cancel_requested").HasDefaultValue(false);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.RecordingId);
        });

        modelBuilder.Entity<AppSetting>(e =>
        {
            e.ToTable("settings");
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasColumnName("key");
            e.Property(x => x.Value).HasColumnName("value").IsRequired();
        });

        modelBuilder.Entity<RagChunk>(e =>
        {
            e.ToTable("rag_chunks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").IsRequired();
            e.Property(x => x.NoteId).HasColumnName("note_id")
                .HasConversion(v => v.ToString("D"), v => Guid.Parse(v))
                .IsRequired();
            e.Property(x => x.Text).HasColumnName("text").IsRequired();
            e.Property(x => x.Embedding).HasColumnName("embedding").IsRequired();
            e.Property(x => x.Dimensions).HasColumnName("dimensions").IsRequired();
            e.Property(x => x.Schema).HasColumnName("schema")
                .IsRequired()
                .HasDefaultValue("v1");
            e.HasIndex(x => x.NoteId).HasDatabaseName("ix_rag_chunks_note_id");
        });
    }
}

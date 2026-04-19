using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Mozgoslav.Infrastructure.Persistence;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations
{
    [DbContext(typeof(MozgoslavDbContext))]
    [Migration("20260417232231_Baseline")]
    partial class Baseline
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "10.0.6");

            modelBuilder.Entity("Mozgoslav.Domain.Entities.ProcessedNote", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("TEXT")
                        .HasColumnName("id");

                    b.Property<string>("ActionItems")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("action_items_json");

                    b.Property<string>("CleanTranscript")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("clean_transcript");

                    b.Property<string>("ConversationType")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("conversation_type");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("TEXT")
                        .HasColumnName("created_at");

                    b.Property<string>("Decisions")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("decisions_json");

                    b.Property<bool>("ExportedToVault")
                        .HasColumnType("INTEGER")
                        .HasColumnName("exported_to_vault");

                    b.Property<string>("FullTranscript")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("full_transcript");

                    b.Property<string>("KeyPoints")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("key_points_json");

                    b.Property<string>("MarkdownContent")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("markdown_content");

                    b.Property<string>("Participants")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("participants_json");

                    b.Property<Guid>("ProfileId")
                        .HasColumnType("TEXT")
                        .HasColumnName("profile_id");

                    b.Property<string>("Source")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("source");

                    b.Property<string>("Summary")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("summary");

                    b.Property<string>("Tags")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("tags_json");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("title");

                    b.Property<string>("Topic")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("topic");

                    b.Property<Guid>("TranscriptId")
                        .HasColumnType("TEXT")
                        .HasColumnName("transcript_id");

                    b.Property<string>("UnresolvedQuestions")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("unresolved_questions_json");

                    b.Property<string>("VaultPath")
                        .HasColumnType("TEXT")
                        .HasColumnName("vault_path");

                    b.Property<int>("Version")
                        .HasColumnType("INTEGER")
                        .HasColumnName("version");

                    b.HasKey("Id");

                    b.HasIndex("TranscriptId");

                    b.ToTable("processed_notes", (string)null);
                });

            modelBuilder.Entity("Mozgoslav.Domain.Entities.ProcessingJob", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("TEXT")
                        .HasColumnName("id");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("TEXT")
                        .HasColumnName("created_at");

                    b.Property<string>("CurrentStep")
                        .HasColumnType("TEXT")
                        .HasColumnName("current_step");

                    b.Property<string>("ErrorMessage")
                        .HasColumnType("TEXT")
                        .HasColumnName("error_message");

                    b.Property<DateTime?>("FinishedAt")
                        .HasColumnType("TEXT")
                        .HasColumnName("finished_at");

                    b.Property<Guid>("ProfileId")
                        .HasColumnType("TEXT")
                        .HasColumnName("profile_id");

                    b.Property<int>("Progress")
                        .HasColumnType("INTEGER")
                        .HasColumnName("progress");

                    b.Property<Guid>("RecordingId")
                        .HasColumnType("TEXT")
                        .HasColumnName("recording_id");

                    b.Property<DateTime?>("StartedAt")
                        .HasColumnType("TEXT")
                        .HasColumnName("started_at");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("status");

                    b.Property<string>("UserHint")
                        .HasColumnType("TEXT")
                        .HasColumnName("user_hint");

                    b.HasKey("Id");

                    b.HasIndex("RecordingId");

                    b.HasIndex("Status");

                    b.ToTable("processing_jobs", (string)null);
                });

            modelBuilder.Entity("Mozgoslav.Domain.Entities.Profile", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("TEXT")
                        .HasColumnName("id");

                    b.Property<string>("AutoTags")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("auto_tags_json");

                    b.Property<string>("CleanupLevel")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("cleanup_level");

                    b.Property<string>("ExportFolder")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("export_folder");

                    b.Property<bool>("IsBuiltIn")
                        .HasColumnType("INTEGER")
                        .HasColumnName("is_built_in");

                    b.Property<bool>("IsDefault")
                        .HasColumnType("INTEGER")
                        .HasColumnName("is_default");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("name");

                    b.Property<string>("OutputTemplate")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("output_template");

                    b.Property<string>("SystemPrompt")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("system_prompt");

                    b.Property<string>("TranscriptionPromptOverride")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("transcription_prompt_override");

                    b.HasKey("Id");

                    b.ToTable("profiles", (string)null);
                });

            modelBuilder.Entity("Mozgoslav.Domain.Entities.Recording", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("TEXT")
                        .HasColumnName("id");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("TEXT")
                        .HasColumnName("created_at");

                    b.Property<long>("Duration")
                        .HasColumnType("INTEGER")
                        .HasColumnName("duration_ms");

                    b.Property<string>("FileName")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("file_name");

                    b.Property<string>("FilePath")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("file_path");

                    b.Property<string>("Format")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("format");

                    b.Property<string>("Sha256")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("sha256");

                    b.Property<string>("SourceType")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("source_type");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("status");

                    b.HasKey("Id");

                    b.HasIndex("CreatedAt");

                    b.HasIndex("Sha256")
                        .IsUnique();

                    b.ToTable("recordings", (string)null);
                });

            modelBuilder.Entity("Mozgoslav.Domain.Entities.Transcript", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("TEXT")
                        .HasColumnName("id");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("TEXT")
                        .HasColumnName("created_at");

                    b.Property<string>("Language")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("language");

                    b.Property<string>("ModelUsed")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("model_used");

                    b.Property<string>("RawText")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("raw_text");

                    b.Property<Guid>("RecordingId")
                        .HasColumnType("TEXT")
                        .HasColumnName("recording_id");

                    b.Property<string>("Segments")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("segments_json");

                    b.HasKey("Id");

                    b.HasIndex("RecordingId");

                    b.ToTable("transcripts", (string)null);
                });

            modelBuilder.Entity("Mozgoslav.Infrastructure.Persistence.AppSetting", b =>
                {
                    b.Property<string>("Key")
                        .HasColumnType("TEXT")
                        .HasColumnName("key");

                    b.Property<string>("Value")
                        .IsRequired()
                        .HasColumnType("TEXT")
                        .HasColumnName("value");

                    b.HasKey("Key");

                    b.ToTable("settings", (string)null);
                });
#pragma warning restore 612, 618
        }
    }
}

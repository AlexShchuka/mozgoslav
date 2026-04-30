using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class Baseline : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.CreateTable(
            name: "processed_notes",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                transcript_id = table.Column<Guid>(type: "TEXT", nullable: false),
                profile_id = table.Column<Guid>(type: "TEXT", nullable: false),
                version = table.Column<int>(type: "INTEGER", nullable: false),
                source = table.Column<string>(type: "TEXT", nullable: false),
                title = table.Column<string>(type: "TEXT", nullable: false),
                summary = table.Column<string>(type: "TEXT", nullable: false),
                key_points_json = table.Column<string>(type: "TEXT", nullable: false),
                decisions_json = table.Column<string>(type: "TEXT", nullable: false),
                action_items_json = table.Column<string>(type: "TEXT", nullable: false),
                unresolved_questions_json = table.Column<string>(type: "TEXT", nullable: false),
                participants_json = table.Column<string>(type: "TEXT", nullable: false),
                topic = table.Column<string>(type: "TEXT", nullable: false),
                conversation_type = table.Column<string>(type: "TEXT", nullable: false),
                clean_transcript = table.Column<string>(type: "TEXT", nullable: false),
                full_transcript = table.Column<string>(type: "TEXT", nullable: false),
                tags_json = table.Column<string>(type: "TEXT", nullable: false),
                markdown_content = table.Column<string>(type: "TEXT", nullable: false),
                exported_to_vault = table.Column<bool>(type: "INTEGER", nullable: false),
                vault_path = table.Column<string>(type: "TEXT", nullable: true),
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_processed_notes", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "processing_job_stages",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                job_id = table.Column<Guid>(type: "TEXT", nullable: false),
                stage_name = table.Column<string>(type: "TEXT", nullable: false),
                started_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                finished_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                duration_ms = table.Column<int>(type: "INTEGER", nullable: true),
                error_message = table.Column<string>(type: "TEXT", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_processing_job_stages", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "processing_jobs",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                recording_id = table.Column<Guid>(type: "TEXT", nullable: false),
                profile_id = table.Column<Guid>(type: "TEXT", nullable: false),
                status = table.Column<string>(type: "TEXT", nullable: false),
                progress = table.Column<int>(type: "INTEGER", nullable: false),
                current_step = table.Column<string>(type: "TEXT", nullable: true),
                error_message = table.Column<string>(type: "TEXT", nullable: true),
                user_hint = table.Column<string>(type: "TEXT", nullable: true),
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false),
                started_at = table.Column<DateTime>(type: "TEXT", nullable: true),
                finished_at = table.Column<DateTime>(type: "TEXT", nullable: true),
                cancel_requested = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_processing_jobs", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "profiles",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                name = table.Column<string>(type: "TEXT", nullable: false),
                system_prompt = table.Column<string>(type: "TEXT", nullable: false),
                transcription_prompt_override = table.Column<string>(type: "TEXT", nullable: false),
                output_template = table.Column<string>(type: "TEXT", nullable: false),
                cleanup_level = table.Column<string>(type: "TEXT", nullable: false),
                export_folder = table.Column<string>(type: "TEXT", nullable: false),
                auto_tags_json = table.Column<string>(type: "TEXT", nullable: false),
                is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                is_built_in = table.Column<bool>(type: "INTEGER", nullable: false),
                glossary_by_language_json = table.Column<string>(type: "TEXT", nullable: false),
                llm_correction_enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                llm_provider_override = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                llm_model_override = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_profiles", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "prompt_templates",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                name = table.Column<string>(type: "TEXT", nullable: false),
                body = table.Column<string>(type: "TEXT", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_prompt_templates", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "rag_chunks",
            columns: table => new
            {
                id = table.Column<string>(type: "TEXT", nullable: false),
                note_id = table.Column<string>(type: "TEXT", nullable: false),
                text = table.Column<string>(type: "TEXT", nullable: false),
                embedding = table.Column<byte[]>(type: "BLOB", nullable: false),
                dimensions = table.Column<int>(type: "INTEGER", nullable: false),
                schema = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "v1"),
                created_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false, defaultValue: new DateTimeOffset(new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0))),
                profile_id = table.Column<string>(type: "TEXT", nullable: true),
                speaker = table.Column<string>(type: "TEXT", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_rag_chunks", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "recordings",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                file_name = table.Column<string>(type: "TEXT", nullable: false),
                file_path = table.Column<string>(type: "TEXT", nullable: false),
                sha256 = table.Column<string>(type: "TEXT", nullable: false),
                duration_ms = table.Column<long>(type: "INTEGER", nullable: false),
                format = table.Column<string>(type: "TEXT", nullable: false),
                source_type = table.Column<string>(type: "TEXT", nullable: false),
                status = table.Column<string>(type: "TEXT", nullable: false),
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_recordings", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "routine_runs",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                routine_key = table.Column<string>(type: "TEXT", nullable: false),
                started_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                finished_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                status = table.Column<string>(type: "TEXT", nullable: false),
                error_message = table.Column<string>(type: "TEXT", nullable: true),
                payload_summary = table.Column<string>(type: "TEXT", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_routine_runs", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "settings",
            columns: table => new
            {
                key = table.Column<string>(type: "TEXT", nullable: false),
                value = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_settings", x => x.key);
            });

        migrationBuilder.CreateTable(
            name: "transcripts",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                recording_id = table.Column<Guid>(type: "TEXT", nullable: false),
                model_used = table.Column<string>(type: "TEXT", nullable: false),
                language = table.Column<string>(type: "TEXT", nullable: false),
                raw_text = table.Column<string>(type: "TEXT", nullable: false),
                segments_json = table.Column<string>(type: "TEXT", nullable: false),
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_transcripts", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_processed_notes_transcript_id",
            table: "processed_notes",
            column: "transcript_id");

        migrationBuilder.CreateIndex(
            name: "ix_processing_job_stages_job_id",
            table: "processing_job_stages",
            column: "job_id");

        migrationBuilder.CreateIndex(
            name: "IX_processing_jobs_recording_id",
            table: "processing_jobs",
            column: "recording_id");

        migrationBuilder.CreateIndex(
            name: "IX_processing_jobs_status",
            table: "processing_jobs",
            column: "status");

        migrationBuilder.CreateIndex(
            name: "ix_prompt_templates_name",
            table: "prompt_templates",
            column: "name");

        migrationBuilder.CreateIndex(
            name: "ix_rag_chunks_created_at",
            table: "rag_chunks",
            column: "created_at");

        migrationBuilder.CreateIndex(
            name: "ix_rag_chunks_note_id",
            table: "rag_chunks",
            column: "note_id");

        migrationBuilder.CreateIndex(
            name: "IX_recordings_created_at",
            table: "recordings",
            column: "created_at");

        migrationBuilder.CreateIndex(
            name: "IX_recordings_sha256",
            table: "recordings",
            column: "sha256");

        migrationBuilder.CreateIndex(
            name: "ix_routine_runs_routine_key",
            table: "routine_runs",
            column: "routine_key");

        migrationBuilder.CreateIndex(
            name: "ix_routine_runs_started_at",
            table: "routine_runs",
            column: "started_at");

        migrationBuilder.CreateIndex(
            name: "IX_transcripts_recording_id",
            table: "transcripts",
            column: "recording_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}

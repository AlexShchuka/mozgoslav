using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

/// <inheritdoc />
public partial class Baseline : Migration
{
    /// <inheritdoc />
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
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_processed_notes", x => x.id);
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
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_profiles", x => x.id);
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
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_recordings", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "settings",
            columns: table => new
            {
                key = table.Column<string>(type: "TEXT", nullable: false),
                value = table.Column<string>(type: "TEXT", nullable: false),
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
                created_at = table.Column<DateTime>(type: "TEXT", nullable: false),
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
            name: "IX_processing_jobs_recording_id",
            table: "processing_jobs",
            column: "recording_id");

        migrationBuilder.CreateIndex(
            name: "IX_processing_jobs_status",
            table: "processing_jobs",
            column: "status");

        migrationBuilder.CreateIndex(
            name: "IX_recordings_created_at",
            table: "recordings",
            column: "created_at");

        migrationBuilder.CreateIndex(
            name: "IX_recordings_sha256",
            table: "recordings",
            column: "sha256",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_transcripts_recording_id",
            table: "transcripts",
            column: "recording_id");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);
        migrationBuilder.DropTable(name: "processed_notes");
        migrationBuilder.DropTable(name: "processing_jobs");
        migrationBuilder.DropTable(name: "profiles");
        migrationBuilder.DropTable(name: "recordings");
        migrationBuilder.DropTable(name: "settings");
        migrationBuilder.DropTable(name: "transcripts");
    }
}

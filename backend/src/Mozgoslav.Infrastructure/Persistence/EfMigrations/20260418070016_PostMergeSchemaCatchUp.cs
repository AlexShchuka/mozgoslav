using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

/// <inheritdoc />
public partial class PostMergeSchemaCatchUp : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);
        migrationBuilder.AddColumn<string>(
            name: "glossary_json",
            table: "profiles",
            type: "TEXT",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<bool>(
            name: "llm_correction_enabled",
            table: "profiles",
            type: "INTEGER",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "cancel_requested",
            table: "processing_jobs",
            type: "INTEGER",
            nullable: false,
            defaultValue: false);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);
        migrationBuilder.DropColumn(
            name: "glossary_json",
            table: "profiles");

        migrationBuilder.DropColumn(
            name: "llm_correction_enabled",
            table: "profiles");

        migrationBuilder.DropColumn(
            name: "cancel_requested",
            table: "processing_jobs");
    }
}

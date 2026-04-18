using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

/// <inheritdoc />
public partial class DropRecordingSha256Unique : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        // Product decision 2026-04-19 — allow duplicate audio imports. The
        // prior unique index silently collapsed re-imports onto the original
        // Recording row; users now expect each "import" click to produce a
        // fresh timeline entry (per meeting note). Idempotency stays on the
        // vault-export path, not at the recording layer.
        migrationBuilder.DropIndex(
            name: "IX_recordings_sha256",
            table: "recordings");

        migrationBuilder.CreateIndex(
            name: "IX_recordings_sha256",
            table: "recordings",
            column: "sha256");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.DropIndex(
            name: "IX_recordings_sha256",
            table: "recordings");

        migrationBuilder.CreateIndex(
            name: "IX_recordings_sha256",
            table: "recordings",
            column: "sha256",
            unique: true);
    }
}

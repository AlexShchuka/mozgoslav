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

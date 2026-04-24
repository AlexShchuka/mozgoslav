using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class DropRecordingSha256Unique : Migration
{
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

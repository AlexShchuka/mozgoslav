using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class AddDownloadJobs : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "download_jobs",
            columns: table => new
            {
                id = table.Column<Guid>(type: "TEXT", nullable: false),
                catalogue_id = table.Column<string>(type: "TEXT", nullable: false),
                source_url = table.Column<string>(type: "TEXT", nullable: false),
                destination_path = table.Column<string>(type: "TEXT", nullable: false),
                state = table.Column<string>(type: "TEXT", nullable: false),
                bytes_received = table.Column<long>(type: "INTEGER", nullable: false),
                total_bytes = table.Column<long>(type: "INTEGER", nullable: true),
                expected_sha256 = table.Column<string>(type: "TEXT", nullable: true),
                error_kind = table.Column<string>(type: "TEXT", nullable: true),
                error_message = table.Column<string>(type: "TEXT", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                started_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                finished_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_download_jobs", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_download_jobs_catalogue_id",
            table: "download_jobs",
            column: "catalogue_id");

        migrationBuilder.CreateIndex(
            name: "ix_download_jobs_created_at",
            table: "download_jobs",
            column: "created_at");

        migrationBuilder.CreateIndex(
            name: "ix_download_jobs_state",
            table: "download_jobs",
            column: "state");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "download_jobs");
    }
}

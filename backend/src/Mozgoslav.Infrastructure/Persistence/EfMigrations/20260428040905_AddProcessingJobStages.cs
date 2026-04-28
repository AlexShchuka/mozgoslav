using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class AddProcessingJobStages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

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

        migrationBuilder.CreateIndex(
            name: "ix_processing_job_stages_job_id",
            table: "processing_job_stages",
            column: "job_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.DropTable(name: "processing_job_stages");
    }
}

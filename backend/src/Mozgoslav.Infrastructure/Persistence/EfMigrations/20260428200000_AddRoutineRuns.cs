using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class AddRoutineRuns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

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
                payload_summary = table.Column<string>(type: "TEXT", nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_routine_runs", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_routine_runs_routine_key",
            table: "routine_runs",
            column: "routine_key");

        migrationBuilder.CreateIndex(
            name: "ix_routine_runs_started_at",
            table: "routine_runs",
            column: "started_at");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.DropTable(name: "routine_runs");
    }
}

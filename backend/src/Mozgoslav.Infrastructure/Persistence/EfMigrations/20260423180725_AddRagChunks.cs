using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class AddRagChunks : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS rag_chunks (
                id TEXT NOT NULL PRIMARY KEY,
                note_id TEXT NOT NULL,
                text TEXT NOT NULL,
                embedding BLOB NOT NULL,
                dimensions INTEGER NOT NULL,
                schema TEXT NOT NULL DEFAULT 'v1'
            );
            """);

        migrationBuilder.Sql(
            "CREATE INDEX IF NOT EXISTS ix_rag_chunks_note_id ON rag_chunks(note_id);");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.Sql("DROP INDEX IF EXISTS ix_rag_chunks_note_id;");
        migrationBuilder.Sql("DROP TABLE IF EXISTS rag_chunks;");
    }
}

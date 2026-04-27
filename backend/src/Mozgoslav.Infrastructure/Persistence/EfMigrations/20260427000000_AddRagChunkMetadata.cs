using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mozgoslav.Infrastructure.Persistence.EfMigrations;

public partial class AddRagChunkMetadata : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.Sql("""
            ALTER TABLE rag_chunks ADD COLUMN created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00+00:00';
            """);

        migrationBuilder.Sql("""
            ALTER TABLE rag_chunks ADD COLUMN profile_id TEXT NULL;
            """);

        migrationBuilder.Sql("""
            ALTER TABLE rag_chunks ADD COLUMN speaker TEXT NULL;
            """);

        migrationBuilder.Sql(
            "CREATE INDEX IF NOT EXISTS ix_rag_chunks_created_at ON rag_chunks(created_at);");

        migrationBuilder.Sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(chunk_id UNINDEXED, content);
            """);

        migrationBuilder.Sql("""
            CREATE TRIGGER IF NOT EXISTS rag_chunks_fts_ai
            AFTER INSERT ON rag_chunks
            BEGIN
                INSERT INTO rag_chunks_fts(chunk_id, content) VALUES (NEW.id, NEW.text);
            END;
            """);

        migrationBuilder.Sql("""
            CREATE TRIGGER IF NOT EXISTS rag_chunks_fts_au
            AFTER UPDATE ON rag_chunks
            BEGIN
                UPDATE rag_chunks_fts SET content = NEW.text WHERE chunk_id = OLD.id;
            END;
            """);

        migrationBuilder.Sql("""
            CREATE TRIGGER IF NOT EXISTS rag_chunks_fts_ad
            AFTER DELETE ON rag_chunks
            BEGIN
                DELETE FROM rag_chunks_fts WHERE chunk_id = OLD.id;
            END;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        ArgumentNullException.ThrowIfNull(migrationBuilder);

        migrationBuilder.Sql("DROP TRIGGER IF EXISTS rag_chunks_fts_ad;");
        migrationBuilder.Sql("DROP TRIGGER IF EXISTS rag_chunks_fts_au;");
        migrationBuilder.Sql("DROP TRIGGER IF EXISTS rag_chunks_fts_ai;");
        migrationBuilder.Sql("DROP TABLE IF EXISTS rag_chunks_fts;");
        migrationBuilder.Sql("DROP INDEX IF EXISTS ix_rag_chunks_created_at;");
    }
}

namespace Mozgoslav.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration marker #0008 — ADR-007-shared §2.8 / Phase 2 Backend MR C.
/// <para>
/// Adds the <c>rag_chunks</c> table that backs
/// <see cref="Mozgoslav.Infrastructure.Rag.SqliteVectorIndex"/>. Schema:
/// </para>
/// <code>
///   rag_chunks (
///       id         TEXT PRIMARY KEY,
///       note_id    TEXT NOT NULL,
///       text       TEXT NOT NULL,
///       embedding  BLOB NOT NULL,    -- little-endian float32[] of length `dimensions`
///       dimensions INTEGER NOT NULL, -- lets us skip rows mid-swap if embedder dims change
///       schema     TEXT NOT NULL DEFAULT 'v1'
///   );
///   CREATE INDEX ix_rag_chunks_note_id ON rag_chunks(note_id);
/// </code>
/// <para>
/// The table is created by <see cref="Mozgoslav.Infrastructure.Rag.SqliteVectorIndex.EnsureSchema"/>
/// on first use — the repo still bootstraps the overall database via EF Core's
/// <c>EnsureCreated</c> (see <see cref="Mozgoslav.Infrastructure.Seed.DatabaseInitializer"/>).
/// This file keeps the ADR-007 / §2.8 migration ledger accurate so the 0008 slot
/// is taken and no peer MR can collide on the index.
/// </para>
/// <para>
/// When EF migrations tooling is adopted (Phase 1 open item #2), this marker
/// will be replaced by a generated <c>0008_rag_embeddings.Designer.cs</c> +
/// <c>0008_rag_embeddings.cs</c> pair that emits the DDL directly in
/// <see cref="Microsoft.EntityFrameworkCore.Migrations.Migration.Up"/>.
/// </para>
/// <para>
/// We intentionally do NOT add the <c>sqlite-vec</c> native extension here.
/// Existing <c>SqliteVectorIndex</c> performs brute-force cosine search on
/// client; it is comfortably fast for personal note corpora (see the class
/// docblock). Swapping in <c>sqlite-vec</c> is a drop-in replacement guarded by
/// an ops-time decision, not a code change here.
/// </para>
/// </summary>
internal static class Migration0008RagEmbeddings
{
    public const string Id = "0008_rag_embeddings";
}

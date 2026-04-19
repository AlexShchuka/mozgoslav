using System;
using System.Buffers.Binary;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Data.Sqlite;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

/// <summary>
/// ADR-005 D2 production path — persists chunk embeddings in a SQLite
/// <c>rag_chunks</c> table so the index survives process restarts. The
/// search path is still brute-force cosine (fetch all vectors, compute
/// locally); this is the classic fallback for <c>sqlite-vss</c> / <c>sqlite-vec</c>:
/// drop in the extension and change <c>SearchAsync</c> to delegate to the
/// virtual table without touching the rest of the pipeline.
/// <para>
/// The chunker produces a few thousand chunks for a personal note corpus,
/// which is comfortably within brute-force territory (&lt;50 ms search
/// with 384-dim vectors on a laptop). Anything larger benefits from ANN,
/// at which point the user should install the extension — see
/// <c>docs/rag-persistence.md</c>.
/// </para>
/// </summary>
public sealed class SqliteVectorIndex : IVectorIndex, IAsyncDisposable
{
    private const string SchemaVersion = "v1";
    private readonly string _connectionString;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private bool _initialised;
    private bool _disposed;

    public SqliteVectorIndex(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new ArgumentException("Connection string must be non-empty.", nameof(connectionString));
        }
        _connectionString = connectionString;
    }

    public int Count
    {
        get
        {
            EnsureSchema();
            using var conn = Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM rag_chunks";
            var value = cmd.ExecuteScalar();
            return Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }
    }

    public async Task UpsertAsync(NoteChunk chunk, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(chunk);
        EnsureSchema();

        await _mutex.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await using var conn = Open();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                INSERT INTO rag_chunks (id, note_id, text, embedding, dimensions)
                VALUES ($id, $note_id, $text, $embedding, $dimensions)
                ON CONFLICT(id) DO UPDATE SET
                    note_id = excluded.note_id,
                    text = excluded.text,
                    embedding = excluded.embedding,
                    dimensions = excluded.dimensions
                """;
            cmd.Parameters.AddWithValue("$id", chunk.Id);
            cmd.Parameters.AddWithValue("$note_id", chunk.NoteId.ToString("D"));
            cmd.Parameters.AddWithValue("$text", chunk.Text);
            cmd.Parameters.AddWithValue("$embedding", Serialize(chunk.Embedding));
            cmd.Parameters.AddWithValue("$dimensions", chunk.Embedding.Length);
            await cmd.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task RemoveByNoteAsync(Guid noteId, CancellationToken ct)
    {
        EnsureSchema();

        await _mutex.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await using var conn = Open();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM rag_chunks WHERE note_id = $note_id";
            cmd.Parameters.AddWithValue("$note_id", noteId.ToString("D"));
            await cmd.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<IReadOnlyList<NoteChunkHit>> SearchAsync(
        float[] queryEmbedding,
        int topK,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(queryEmbedding);
        if (topK <= 0)
        {
            return [];
        }
        EnsureSchema();

        var matches = new List<NoteChunkHit>(128);

        await _mutex.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await using var conn = Open();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, note_id, text, embedding, dimensions FROM rag_chunks";
            await using var reader = await cmd.ExecuteReaderAsync(ct).ConfigureAwait(false);
            while (await reader.ReadAsync(ct).ConfigureAwait(false))
            {
                var dimensions = reader.GetInt32(4);
                if (dimensions != queryEmbedding.Length)
                {
                    continue;
                }

                var blob = (byte[])reader["embedding"];
                var embedding = Deserialize(blob, dimensions);
                var score = InMemoryVectorIndex.CosineSimilarity(queryEmbedding, embedding);
                var chunk = new NoteChunk(
                    Id: reader.GetString(0),
                    NoteId: Guid.Parse(reader.GetString(1)),
                    Text: reader.GetString(2),
                    Embedding: embedding);
                matches.Add(new NoteChunkHit(chunk, score));
            }
        }
        finally
        {
            _mutex.Release();
        }

        matches.Sort((a, b) => b.Score.CompareTo(a.Score));
        IReadOnlyList<NoteChunkHit> result = matches.Take(topK).ToArray();
        return result;
    }

    public ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return ValueTask.CompletedTask;
        }
        _disposed = true;
        _mutex.Dispose();
        return ValueTask.CompletedTask;
    }


    private SqliteConnection Open()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        return conn;
    }

    private void EnsureSchema()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (_initialised)
        {
            return;
        }
        _mutex.Wait();
        try
        {
            if (_initialised)
            {
                return;
            }
            using var conn = Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"""
                CREATE TABLE IF NOT EXISTS rag_chunks (
                    id TEXT PRIMARY KEY,
                    note_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    embedding BLOB NOT NULL,
                    dimensions INTEGER NOT NULL,
                    schema TEXT NOT NULL DEFAULT '{SchemaVersion}'
                );
                CREATE INDEX IF NOT EXISTS ix_rag_chunks_note_id ON rag_chunks(note_id);
                """;
            cmd.ExecuteNonQuery();
            _initialised = true;
        }
        finally
        {
            _mutex.Release();
        }
    }

    internal static byte[] Serialize(float[] vector)
    {
        var buffer = new byte[vector.Length * sizeof(float)];
        for (var i = 0; i < vector.Length; i++)
        {
            BinaryPrimitives.WriteSingleLittleEndian(
                buffer.AsSpan(i * sizeof(float), sizeof(float)),
                vector[i]);
        }
        return buffer;
    }

    internal static float[] Deserialize(byte[] blob, int dimensions)
    {
        var vector = new float[dimensions];
        for (var i = 0; i < dimensions; i++)
        {
            vector[i] = BinaryPrimitives.ReadSingleLittleEndian(
                blob.AsSpan(i * sizeof(float), sizeof(float)));
        }
        return vector;
    }
}

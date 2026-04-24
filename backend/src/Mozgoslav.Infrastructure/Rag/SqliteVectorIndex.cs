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

public sealed class SqliteVectorIndex : IVectorIndex, IAsyncDisposable
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _mutex = new(1, 1);
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
            ObjectDisposedException.ThrowIf(_disposed, this);
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
        ObjectDisposedException.ThrowIf(_disposed, this);

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
        ObjectDisposedException.ThrowIf(_disposed, this);

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
        ObjectDisposedException.ThrowIf(_disposed, this);

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

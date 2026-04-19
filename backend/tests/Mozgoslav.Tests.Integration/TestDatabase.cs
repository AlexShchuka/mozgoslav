using System;
using System.IO;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// Spins up a throw-away SQLite file + EF Core context factory for a single test,
/// creates the schema and cleans up on dispose. Use inside <c>await using</c>.
/// </summary>
internal sealed class TestDatabase : IAsyncDisposable, IDisposable
{
    public string Path { get; }
    public string ConnectionString { get; }

    public TestDatabase()
    {
        Path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), $"mozgoslav-int-{Guid.NewGuid():N}.db");
        ConnectionString = $"Data Source={Path}";

        using var db = CreateContext();
        db.Database.Migrate();
    }

    public MozgoslavDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MozgoslavDbContext>()
            .UseSqlite(ConnectionString)
            .Options;
        return new MozgoslavDbContext(options);
    }

    public IDbContextFactory<MozgoslavDbContext> CreateFactory() =>
        new PooledFactory(ConnectionString);

    public void Dispose() => TryDelete();

    public ValueTask DisposeAsync()
    {
        TryDelete();
        return ValueTask.CompletedTask;
    }

    private void TryDelete()
    {
        try
        {
            if (File.Exists(Path))
            {
                File.Delete(Path);
            }
        }
        catch
        {
        }
    }

    private sealed class PooledFactory : IDbContextFactory<MozgoslavDbContext>
    {
        private readonly DbContextOptions<MozgoslavDbContext> _options;

        public PooledFactory(string connectionString)
        {
            _options = new DbContextOptionsBuilder<MozgoslavDbContext>()
                .UseSqlite(connectionString)
                .Options;
        }

        public MozgoslavDbContext CreateDbContext() => new(_options);
    }
}

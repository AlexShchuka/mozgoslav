using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mozgoslav.Infrastructure.Persistence;

/// <summary>
/// ADR-011 step 1 — design-time factory used by the <c>dotnet ef</c> tool when
/// generating migrations. Points the generated SQL at a throw-away SQLite file
/// so the tool never touches the user's real database; only the DDL shape of
/// <see cref="MozgoslavDbContext.OnModelCreating"/> matters to the output.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<MozgoslavDbContext>
{
    public MozgoslavDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<MozgoslavDbContext>()
            .UseSqlite("Data Source=design-time.db")
            .Options;
        return new MozgoslavDbContext(options);
    }
}

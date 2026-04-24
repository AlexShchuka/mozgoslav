using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mozgoslav.Infrastructure.Persistence;

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

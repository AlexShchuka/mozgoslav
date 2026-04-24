using System.Linq;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Backup;

[ExtendObjectType(typeof(QueryType))]
public sealed class BackupQueryType
{
    public BackupEntry[] Backups([Service] BackupService service)
    {
        return service.List()
            .Select(f => new BackupEntry(f.Name, f.FullName, f.Length, f.LastWriteTimeUtc))
            .ToArray();
    }
}

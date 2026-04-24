using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Backup;

[ExtendObjectType(typeof(MutationType))]
public sealed class BackupMutationType
{
    public async Task<CreateBackupPayload> CreateBackup(
        [Service] BackupService service,
        CancellationToken ct)
    {
        try
        {
            var path = await service.CreateAsync(ct);
            var info = new FileInfo(path);
            return new CreateBackupPayload(
                new BackupEntry(info.Name, path, info.Length, info.LastWriteTimeUtc),
                []);
        }
        catch (Exception ex)
        {
            return new CreateBackupPayload(null, [new UnavailableError("BACKUP_FAILED", ex.Message)]);
        }
    }
}

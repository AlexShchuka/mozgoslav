using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Backup;

public sealed record CreateBackupPayload(
    BackupEntry? Backup,
    IReadOnlyList<IUserError> Errors);

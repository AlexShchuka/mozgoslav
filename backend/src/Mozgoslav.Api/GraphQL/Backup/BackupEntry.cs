using System;

namespace Mozgoslav.Api.GraphQL.Backup;

public sealed record BackupEntry(
    string Name,
    string Path,
    long SizeBytes,
    DateTime CreatedAt);

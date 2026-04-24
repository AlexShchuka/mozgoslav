using System;

namespace Mozgoslav.Api.GraphQL.Logs;

public sealed record LogFileEntry(
    string FileName,
    long SizeBytes,
    DateTime LastModifiedUtc);

using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed record FolderMapping(
    Guid Id,
    string Alias,
    string VaultPath,
    ParaCategory Category);

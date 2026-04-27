using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Api.GraphQL.Obsidian;

public sealed record ObsidianDiagnosticsPayload(
    VaultDiagnosticsReport? Report,
    IReadOnlyList<IUserError> Errors);

using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Models;

public sealed record DownloadModelPayload(string? DownloadId, IReadOnlyList<IUserError> Errors);

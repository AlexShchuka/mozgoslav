using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Settings;

public sealed record UpdateSettingsPayload(
    AppSettingsDto? Settings,
    IReadOnlyList<IUserError> Errors);

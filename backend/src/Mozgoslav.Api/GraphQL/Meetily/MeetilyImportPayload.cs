using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Meetily;

public sealed record MeetilyImportPayload(
    int? TotalMeetings,
    int? ImportedRecordings,
    int? SkippedDuplicates,
    int? ImportErrors,
    IReadOnlyList<IUserError> Errors);

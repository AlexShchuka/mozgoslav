using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record DictationCancelPayload(IReadOnlyList<IUserError> Errors);

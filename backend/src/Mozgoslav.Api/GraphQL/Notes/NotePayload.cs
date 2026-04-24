using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Notes;

public sealed record NotePayload(ProcessedNote? Note, IReadOnlyList<IUserError> Errors);

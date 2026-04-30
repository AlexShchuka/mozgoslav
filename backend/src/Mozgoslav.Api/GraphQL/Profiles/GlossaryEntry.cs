using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Profiles;

public sealed record GlossaryEntry(string Language, IReadOnlyList<string> Terms);

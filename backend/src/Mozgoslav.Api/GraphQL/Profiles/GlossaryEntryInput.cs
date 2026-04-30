using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Profiles;

public sealed record GlossaryEntryInput(string Language, IReadOnlyList<string> Terms);

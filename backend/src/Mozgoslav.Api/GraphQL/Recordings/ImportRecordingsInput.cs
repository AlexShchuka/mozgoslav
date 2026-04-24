using System;
using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed record ImportRecordingsInput(IReadOnlyList<string> FilePaths, Guid? ProfileId);

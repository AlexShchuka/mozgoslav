using System;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed record EnqueueJobInput(Guid RecordingId, Guid ProfileId);

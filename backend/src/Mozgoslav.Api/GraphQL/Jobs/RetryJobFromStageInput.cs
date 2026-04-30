using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed record RetryJobFromStageInput(Guid JobId, JobStage FromStage, bool SkipFailed);

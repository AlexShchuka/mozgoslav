using System.Collections.Generic;

using Mozgoslav.Application.Monitoring;

namespace Mozgoslav.Api.GraphQL.Monitoring;

public sealed record PublishElectronServicesInput(IReadOnlyList<SupervisorServiceState> Services);

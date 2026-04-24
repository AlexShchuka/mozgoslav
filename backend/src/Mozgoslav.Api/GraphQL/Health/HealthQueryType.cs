using System;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Health;

[ExtendObjectType(typeof(QueryType))]
public sealed class HealthQueryType
{
    public HealthStatus Health()
    {
        return new HealthStatus("ok", DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture));
    }

    public async Task<LlmHealthStatus> LlmHealth(
        [Service] ILlmService llm,
        CancellationToken ct)
    {
        var available = await llm.IsAvailableAsync(ct);
        return new LlmHealthStatus(available);
    }

    public MetaInfo Meta()
    {
        var assembly = typeof(HealthQueryType).Assembly;
        var version = assembly.GetName().Version?.ToString() ?? "0.0.0";
        var informational = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? version;
        var commit = (Environment.GetEnvironmentVariable("GITHUB_SHA")
            ?? Environment.GetEnvironmentVariable("GIT_COMMIT")
            ?? string.Empty).Trim();
        var buildDate = File.GetLastWriteTimeUtc(assembly.Location)
            .ToString("O", CultureInfo.InvariantCulture);

        return new MetaInfo(informational, version, commit, buildDate);
    }
}

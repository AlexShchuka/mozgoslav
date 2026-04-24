namespace Mozgoslav.Api.GraphQL.Health;

public sealed record MetaInfo(
    string Version,
    string AssemblyVersion,
    string Commit,
    string BuildDate);

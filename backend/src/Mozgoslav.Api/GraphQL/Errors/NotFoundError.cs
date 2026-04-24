namespace Mozgoslav.Api.GraphQL.Errors;

public sealed record NotFoundError(string Code, string Message, string ResourceKind, string ResourceId) : IUserError;

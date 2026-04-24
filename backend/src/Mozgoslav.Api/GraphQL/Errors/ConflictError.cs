namespace Mozgoslav.Api.GraphQL.Errors;

public sealed record ConflictError(string Code, string Message) : IUserError;

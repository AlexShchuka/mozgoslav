namespace Mozgoslav.Api.GraphQL.Errors;

public sealed record UnavailableError(string Code, string Message) : IUserError;

namespace Mozgoslav.Api.GraphQL.Errors;

public sealed record ValidationError(string Code, string Message, string Field) : IUserError;

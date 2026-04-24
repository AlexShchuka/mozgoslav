namespace Mozgoslav.Api.GraphQL.Errors;

public interface IUserError
{
    string Code { get; }
    string Message { get; }
}

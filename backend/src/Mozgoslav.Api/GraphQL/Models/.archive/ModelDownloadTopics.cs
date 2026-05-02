namespace Mozgoslav.Api.GraphQL.Models;

public static class ModelDownloadTopics
{
    public static string ForDownloadId(string downloadId) => $"ModelDownloadProgress:{downloadId}";
}

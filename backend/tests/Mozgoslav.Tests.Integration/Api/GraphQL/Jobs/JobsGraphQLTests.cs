using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Jobs;

[TestClass]
public sealed class JobsGraphQLTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task JobsQuery_ReturnsPagedShape()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  jobs(first: 5) {
                    totalCount
                    nodes { id status createdAt }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["jobs"]!["totalCount"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task ActiveJobsQuery_ReturnsArray()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                query {
                  activeJobs { id status recordingId profileId }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        json["errors"].Should().BeNull();
        json["data"]!["activeJobs"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task EnqueueJobMutation_RecordingNotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation($input: EnqueueJobInput!) {
                  enqueueJob(input: $input) {
                    job { id }
                    errors { code message }
                  }
                }
                """,
            variables = new
            {
                input = new
                {
                    recordingId = "00000000-0000-0000-0000-000000000001",
                    profileId = "00000000-0000-0000-0000-000000000002"
                }
            }
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["enqueueJob"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task CancelJobMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  cancelJob(id: "00000000-0000-0000-0000-000000000003") {
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["cancelJob"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task PauseJobMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  pauseJob(id: "00000000-0000-0000-0000-000000000004") {
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["pauseJob"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task ResumeJobMutation_NotFound_ReturnsNotFoundError()
    {
        using var client = CreateClient();
        var body = new
        {
            query = """
                mutation {
                  resumeJob(id: "00000000-0000-0000-0000-000000000005") {
                    job { id }
                    errors { code message }
                  }
                }
                """
        };

        using var response = await client.PostAsJsonAsync("/graphql", body);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var errors = json["data"]!["resumeJob"]!["errors"]!.AsArray();
        errors.Count.Should().BeGreaterThan(0);
        errors[0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}

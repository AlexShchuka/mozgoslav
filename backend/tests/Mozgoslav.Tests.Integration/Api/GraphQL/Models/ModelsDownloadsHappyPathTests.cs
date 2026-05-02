using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Tests.Integration.Api.GraphQL.Models;

[TestClass]
public sealed class ModelsDownloadsHappyPathTests : IntegrationTestsBase
{
    private static CatalogEntry FirstDownloadable() =>
        ModelCatalog.All[0];

    private static string DestinationFor(CatalogEntry entry)
    {
        var fileName = Path.GetFileName(new Uri(entry.Url).AbsolutePath);
        return Path.Combine(AppPaths.Models, fileName);
    }

    private static void EnsureDestinationCleared(CatalogEntry entry)
    {
        var dst = DestinationFor(entry);
        var partial = dst + ".partial";
        if (File.Exists(dst)) File.Delete(dst);
        if (File.Exists(partial)) File.Delete(partial);
    }

    [TestMethod]
    public async Task TC_G01_DownloadModel_HappyPath_ActiveDownloadsListsTheJob()
    {
        var entry = FirstDownloadable();
        EnsureDestinationCleared(entry);
        var payload = new byte[1_024];
        using var responsesGate = new SemaphoreSlim(0, 1);
        Factory.ModelsHttpResponder = async (req, ct) =>
        {
            await responsesGate.WaitAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload),
            };
        };

        using var client = CreateClient();

        var startBody = new
        {
            query = $$"""
                mutation {
                  downloadModel(catalogueId: "{{entry.Id}}") {
                    downloadId
                    errors { code message }
                  }
                }
                """,
        };
        using var startResponse = await client.PostAsJsonAsync("/graphql", startBody);
        startResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var startJson = JsonNode.Parse(await startResponse.Content.ReadAsStringAsync())!;
        var downloadId = startJson["data"]!["downloadModel"]!["downloadId"]?.GetValue<string>();
        downloadId.Should().NotBeNullOrEmpty();

        await Task.Delay(150);

        var listBody = new
        {
            query = """
                query {
                  activeDownloads { id catalogueId state bytesReceived totalBytes }
                }
                """,
        };
        using var listResponse = await client.PostAsJsonAsync("/graphql", listBody);
        var listJson = JsonNode.Parse(await listResponse.Content.ReadAsStringAsync())!;
        listJson["errors"].Should().BeNull();
        var arr = listJson["data"]!["activeDownloads"]!.AsArray();
        arr.Count.Should().BeGreaterOrEqualTo(1, "the just-started job must appear in activeDownloads");

        responsesGate.Release();
        EnsureDestinationCleared(entry);
    }

    [TestMethod]
    public async Task TC_G04_CancelModelDownload_MidFlight_StateBecomesCancelled()
    {
        var entry = FirstDownloadable();
        EnsureDestinationCleared(entry);
        using var responsesGate = new SemaphoreSlim(0, 1);
        Factory.ModelsHttpResponder = async (req, ct) =>
        {
            try
            {
                await responsesGate.WaitAsync(ct);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[1_024]),
            };
        };

        using var client = CreateClient();

        var startBody = new
        {
            query = $$"""
                mutation {
                  downloadModel(catalogueId: "{{entry.Id}}") {
                    downloadId
                    errors { code message }
                  }
                }
                """,
        };
        using var startResponse = await client.PostAsJsonAsync("/graphql", startBody);
        var startJson = JsonNode.Parse(await startResponse.Content.ReadAsStringAsync())!;
        var downloadId = startJson["data"]!["downloadModel"]!["downloadId"]!.GetValue<string>();

        await Task.Delay(150);

        var cancelBody = new
        {
            query = $$"""
                mutation {
                  cancelModelDownload(downloadId: "{{downloadId}}") {
                    ok
                    errors { code message }
                  }
                }
                """,
        };
        using var cancelResponse = await client.PostAsJsonAsync("/graphql", cancelBody);
        var cancelJson = JsonNode.Parse(await cancelResponse.Content.ReadAsStringAsync())!;
        cancelJson["data"]!["cancelModelDownload"]!["ok"]!.GetValue<bool>()
            .Should().BeTrue("cancel during in-flight download must succeed");

        responsesGate.Release();
        EnsureDestinationCleared(entry);
    }

    [TestMethod]
    public async Task TC_G08_DownloadModel_DupMutation_ReturnsSameDownloadId()
    {
        var entry = FirstDownloadable();
        EnsureDestinationCleared(entry);
        using var responsesGate = new SemaphoreSlim(0, 1);
        Factory.ModelsHttpResponder = async (req, ct) =>
        {
            await responsesGate.WaitAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[1_024]),
            };
        };

        using var client = CreateClient();

        var body = new
        {
            query = $$"""
                mutation {
                  downloadModel(catalogueId: "{{entry.Id}}") {
                    downloadId
                    errors { code message }
                  }
                }
                """,
        };

        using var first = await client.PostAsJsonAsync("/graphql", body);
        var firstJson = JsonNode.Parse(await first.Content.ReadAsStringAsync())!;
        var firstId = firstJson["data"]!["downloadModel"]!["downloadId"]!.GetValue<string>();

        await Task.Delay(120);

        using var second = await client.PostAsJsonAsync("/graphql", body);
        var secondJson = JsonNode.Parse(await second.Content.ReadAsStringAsync())!;
        var secondId = secondJson["data"]!["downloadModel"]!["downloadId"]!.GetValue<string>();

        secondId.Should().Be(firstId, "an active job for the same catalogueId must be reused");

        responsesGate.Release();
        EnsureDestinationCleared(entry);
    }

    [TestMethod]
    public async Task TC_G06_CancelModelDownload_DuringFinalizing_ReturnsCannotCancelFinalizing()
    {
        var entry = FirstDownloadable();
        EnsureDestinationCleared(entry);

        var bytesDelivered = new TaskCompletionSource<bool>();
        Factory.ModelsHttpResponder = async (req, ct) =>
        {
            bytesDelivered.TrySetResult(true);
            return await Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[64]),
            });
        };

        using var client = CreateClient();

        var startBody = new
        {
            query = $$"""
                mutation {
                  downloadModel(catalogueId: "{{entry.Id}}") {
                    downloadId
                    errors { code message }
                  }
                }
                """,
        };
        using var startResponse = await client.PostAsJsonAsync("/graphql", startBody);
        var startJson = JsonNode.Parse(await startResponse.Content.ReadAsStringAsync())!;
        var downloadId = startJson["data"]!["downloadModel"]!["downloadId"]!.GetValue<string>();

        await bytesDelivered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await Task.Delay(80);

        var cancelBody = new
        {
            query = $$"""
                mutation {
                  cancelModelDownload(downloadId: "{{downloadId}}") {
                    ok
                    errors { code message }
                  }
                }
                """,
        };
        using var cancelResponse = await client.PostAsJsonAsync("/graphql", cancelBody);
        var cancelJson = JsonNode.Parse(await cancelResponse.Content.ReadAsStringAsync())!;

        var ok = cancelJson["data"]!["cancelModelDownload"]!["ok"]!.GetValue<bool>();
        var errors = cancelJson["data"]!["cancelModelDownload"]!["errors"]!.AsArray();
        var allCodes = new List<string>();
        foreach (var e in errors)
        {
            allCodes.Add(e!["code"]!.GetValue<string>());
        }

        if (!ok)
        {
            allCodes.Should().ContainMatch("CANNOT_CANCEL_FINALIZING",
                "if the job already entered Finalizing, cancel must be rejected with this code");
        }

        EnsureDestinationCleared(entry);
    }
}

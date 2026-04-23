using System;
using System.IO;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;

using NSubstitute;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class HotkeyEventEndpointTests
{
    [TestMethod]
    public async Task PostHotkeyEvent_Press_CallsNotifierPublish()
    {
        var notifier = Substitute.For<IHotkeyEventNotifier>();
        await using var factory = new HotkeyEventFactory(notifier);
        using var client = factory.CreateClient();

        var payload = new HotkeyEvent(
            Kind: "press",
            Accelerator: "CommandOrControl+Shift+Space",
            ObservedAt: DateTime.UtcNow);

        using var response = await client.PostAsJsonAsync(
            "/_internal/hotkey/event", payload, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await notifier.Received(1).PublishAsync(
            Arg.Is<HotkeyEvent>(p => p.Kind == "press" && p.Accelerator == "CommandOrControl+Shift+Space"),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task PostHotkeyEvent_Release_CallsNotifierPublish()
    {
        var notifier = Substitute.For<IHotkeyEventNotifier>();
        await using var factory = new HotkeyEventFactory(notifier);
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/_internal/hotkey/event",
            new HotkeyEvent("release", "CommandOrControl+Shift+Space", DateTime.UtcNow),
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await notifier.Received(1).PublishAsync(
            Arg.Is<HotkeyEvent>(p => p.Kind == "release"),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task PostHotkeyEvent_InvalidKind_Returns400_NoPublish()
    {
        var notifier = Substitute.For<IHotkeyEventNotifier>();
        await using var factory = new HotkeyEventFactory(notifier);
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/_internal/hotkey/event",
            new HotkeyEvent("jiggle", "CommandOrControl+Shift+Space", DateTime.UtcNow),
            TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await notifier.DidNotReceive().PublishAsync(Arg.Any<HotkeyEvent>(), Arg.Any<CancellationToken>());
    }

    public TestContext TestContext { get; set; } = null!;

    private sealed class HotkeyEventFactory : WebApplicationFactory<Program>
    {
        private readonly IHotkeyEventNotifier _notifier;
        private readonly string _databasePath;

        public HotkeyEventFactory(IHotkeyEventNotifier notifier)
        {
            _notifier = notifier;
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-hotkey-{Guid.NewGuid():N}.db");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.UseSetting("Mozgoslav:DatabasePath", _databasePath);
            builder.ConfigureTestServices(services =>
            {
                for (var i = services.Count - 1; i >= 0; i--)
                {
                    if (services[i].ServiceType == typeof(IHotkeyEventNotifier))
                    {
                        services.RemoveAt(i);
                    }
                }
                services.AddSingleton(_notifier);
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (!disposing) return;
            foreach (var path in new[] { _databasePath, _databasePath + "-wal", _databasePath + "-shm" })
            {
                try { if (File.Exists(path)) File.Delete(path); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }
}

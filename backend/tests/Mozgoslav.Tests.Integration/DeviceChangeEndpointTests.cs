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
public sealed class DeviceChangeEndpointTests
{
    [TestMethod]
    public async Task PostDevicesChanged_WithValidPayload_CallsNotifierPublish()
    {
        var notifier = Substitute.For<IAudioDeviceChangeNotifier>();
        await using var factory = new DeviceChangeFactory(notifier);
        using var client = factory.CreateClient();

        var payload = new AudioDeviceChangePayload(
            Kind: "connected",
            Devices:
            [
                new AudioDeviceInfo("id-1", "Built-in Microphone", IsDefault: true),
                new AudioDeviceInfo("id-2", "AirPods Pro", IsDefault: false)
            ],
            ObservedAt: DateTime.UtcNow);

        using var response = await client.PostAsJsonAsync(
            "/_internal/devices/changed", payload, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await notifier.Received(1).PublishAsync(
            Arg.Is<AudioDeviceChangePayload>(p => p.Kind == "connected" && p.Devices.Count == 2),
            Arg.Any<CancellationToken>());
    }

    public TestContext TestContext { get; set; } = null!;

    private sealed class DeviceChangeFactory : WebApplicationFactory<Program>
    {
        private readonly IAudioDeviceChangeNotifier _notifier;
        private readonly string _databasePath;

        public DeviceChangeFactory(IAudioDeviceChangeNotifier notifier)
        {
            _notifier = notifier;
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-devices-{Guid.NewGuid():N}.db");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.UseSetting("Mozgoslav:DatabasePath", _databasePath);
            builder.ConfigureTestServices(services =>
            {
                for (var i = services.Count - 1; i >= 0; i--)
                {
                    if (services[i].ServiceType == typeof(IAudioDeviceChangeNotifier))
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

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Grpc.Core;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Native.V1;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Platform;

[TestClass]
public sealed class GrpcNativeHelperClientTests
{
    private sealed class Fixture : IDisposable
    {
        private readonly List<AsyncUnaryCall<RunShortcutResult>> _calls = [];

        public DictationHelper.DictationHelperClient GrpcClient { get; } =
            Substitute.For<DictationHelper.DictationHelperClient>();

        [SuppressMessage("IDisposableAnalyzers.Correctness", "IDISP004:Don't ignore created IDisposable",
            Justification = "call is tracked in _calls list and disposed in Dispose()")]
        public void SetupSuccessCall(RunShortcutResult result)
        {
            var call = new AsyncUnaryCall<RunShortcutResult>(
                Task.FromResult(result),
                Task.FromResult(new Metadata()),
                () => Status.DefaultSuccess,
                () => [],
                () => { });
            _calls.Add(call);
            GrpcClient
                .RunShortcutAsync(
                    Arg.Any<RunShortcutRequest>(),
                    Arg.Any<Metadata>(),
                    Arg.Any<DateTime?>(),
                    Arg.Any<CancellationToken>())
                .Returns(call);
        }

        [SuppressMessage("IDisposableAnalyzers.Correctness", "IDISP004:Don't ignore created IDisposable",
            Justification = "call is tracked in _calls list and disposed in Dispose()")]
        public void SetupFailingCall(Exception ex)
        {
            var tcs = new TaskCompletionSource<RunShortcutResult>();
            tcs.SetException(ex);
            var call = new AsyncUnaryCall<RunShortcutResult>(
                tcs.Task,
                Task.FromResult(new Metadata()),
                () => new Status(StatusCode.Unavailable, ex.Message),
                () => [],
                () => { });
            _calls.Add(call);
            GrpcClient
                .RunShortcutAsync(
                    Arg.Any<RunShortcutRequest>(),
                    Arg.Any<Metadata>(),
                    Arg.Any<DateTime?>(),
                    Arg.Any<CancellationToken>())
                .Returns(call);
        }

        public GrpcNativeHelperClient BuildSut() =>
            new(GrpcClient, NullLogger<GrpcNativeHelperClient>.Instance);

        public void Dispose()
        {
            foreach (var c in _calls) c.Dispose();
        }
    }

    [TestMethod]
    public async Task RunShortcutAsync_BlankName_ThrowsArgumentException()
    {
        using var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.RunShortcutAsync("", "input", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task RunShortcutAsync_Success_ReturnsSuccessResult()
    {
        using var fixture = new Fixture();
        fixture.SetupSuccessCall(new RunShortcutResult { Success = true, Stdout = "output text" });
        var sut = fixture.BuildSut();

        var result = await sut.RunShortcutAsync("My Shortcut", "data", CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Output.Should().Be("output text");
        result.Error.Should().BeNull();
    }

    [TestMethod]
    public async Task RunShortcutAsync_EmptyStdout_OutputIsNull()
    {
        using var fixture = new Fixture();
        fixture.SetupSuccessCall(new RunShortcutResult { Success = true, Stdout = string.Empty });
        var sut = fixture.BuildSut();

        var result = await sut.RunShortcutAsync("Shortcut", string.Empty, CancellationToken.None);

        result.Output.Should().BeNull();
    }

    [TestMethod]
    public async Task RunShortcutAsync_GrpcUnavailable_ReturnsFailure()
    {
        using var fixture = new Fixture();
        fixture.SetupFailingCall(new RpcException(new Status(StatusCode.Unavailable, "not available")));
        var sut = fixture.BuildSut();

        var result = await sut.RunShortcutAsync("Shortcut", "input", CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public async Task RunShortcutAsync_NullInput_TreatedAsEmpty()
    {
        using var fixture = new Fixture();
        fixture.SetupSuccessCall(new RunShortcutResult { Success = true });
        var sut = fixture.BuildSut();

        var act = async () => await sut.RunShortcutAsync("Shortcut", null!, CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}

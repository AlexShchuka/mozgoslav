import Foundation
import GRPCCore
import GRPCNIOTransportHTTP2
import GRPCProtobuf
import DictationHelperCore

public final class GrpcServer {
    private static let defaultPort = 50051

    public static func run(
        audioCapture: AudioCaptureService,
        textInjector: TextInjectionService,
        focusDetector: FocusedAppDetector,
        hotkeyMonitor: HotkeyMonitor,
        dumpHotkeyMonitor: HotkeyMonitor,
        askCorpusHotkeyMonitor: HotkeyMonitor
    ) async throws {
        let service = DictationHelperGrpcService(
            audioCapture: audioCapture,
            textInjector: textInjector,
            focusDetector: focusDetector,
            hotkeyMonitor: hotkeyMonitor,
            dumpHotkeyMonitor: dumpHotkeyMonitor,
            askCorpusHotkeyMonitor: askCorpusHotkeyMonitor
        )

        let port = resolvePort()

        FileLog.shared.info("GrpcServer: starting on 127.0.0.1:\(port)")

        let server = GRPCServer(
            transport: .http2NIOPosix(
                address: .ipv4(host: "127.0.0.1", port: port),
                transportSecurity: .plaintext
            ),
            services: [DictationHelperServiceProvider(service: service)]
        )

        try await server.serve()
    }

    private static func resolvePort() -> Int {
        if let portStr = ProcessInfo.processInfo.environment["MOZGOSLAV_HELPER_PORT"],
           let port = Int(portStr),
           port > 0 {
            return port
        }
        return defaultPort
    }
}

private struct DictationHelperServiceProvider: GRPCCore.RegistrableRPCService {
    static let serviceFullName = "mozgoslav.native.v1.DictationHelper"

    let service: DictationHelperGrpcService

    func registerMethods<Transport: ServerTransport>(with router: inout RPCRouter<Transport>) {
        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "StartCapture"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_StartCaptureRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_CaptureStarted>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = try await self.service.startCapture(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }

        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "StopCapture"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_StopCaptureRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_CaptureStopped>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = try await self.service.stopCapture(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }

        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "RunShortcut"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_RunShortcutRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_RunShortcutResult>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = await self.service.runShortcut(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }

        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "CheckPermissions"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_PermissionCheckRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_PermissionStatus>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = await self.service.checkPermissions(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }

        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "RequestPermission"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_PermissionRequestRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_PermissionGranted>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = await self.service.requestPermission(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }

        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "InjectText"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_InjectTextRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_InjectResult>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = try await self.service.injectText(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }

        router.registerHandler(
            forMethod: MethodDescriptor(
                fullyQualifiedService: Self.serviceFullName,
                method: "DetectInjectTarget"
            ),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_DetectTargetRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_InjectTarget>()
        ) { streamRequest, _ in
            let single = try await ServerRequest(stream: streamRequest)
            let reply = await self.service.detectInjectTarget(single.message)
            return StreamingServerResponse(single: ServerResponse(message: reply))
        }
    }
}

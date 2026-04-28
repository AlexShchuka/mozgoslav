import Foundation
import GRPCCore
import GRPCNIOTransportHTTP2
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

        try await server.run()
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
    let service: DictationHelperGrpcService

    func registerMethods(with router: inout GRPCCore.RPCRouter) {
        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "StartCapture"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_StartCaptureRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_CaptureStarted>()
        ) { request, _ in
            let req = try request.message
            let reply = try await self.service.startCapture(req)
            return reply
        }

        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "StopCapture"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_StopCaptureRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_CaptureStopped>()
        ) { request, _ in
            let req = try request.message
            let reply = try await self.service.stopCapture(req)
            return reply
        }

        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "RunShortcut"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_RunShortcutRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_RunShortcutResult>()
        ) { request, _ in
            let req = try request.message
            let reply = await self.service.runShortcut(req)
            return reply
        }

        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "CheckPermissions"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_PermissionCheckRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_PermissionStatus>()
        ) { request, _ in
            let req = try request.message
            let reply = await self.service.checkPermissions(req)
            return reply
        }

        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "RequestPermission"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_PermissionRequestRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_PermissionGranted>()
        ) { request, _ in
            let req = try request.message
            let reply = await self.service.requestPermission(req)
            return reply
        }

        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "InjectText"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_InjectTextRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_InjectResult>()
        ) { request, _ in
            let req = try request.message
            let reply = try await self.service.injectText(req)
            return reply
        }

        router.registerHandler(
            forMethod: MethodDescriptor(service: ServiceDescriptor(fullyQualifiedService: "mozgoslav.native.v1.DictationHelper"), name: "DetectInjectTarget"),
            deserializer: ProtobufDeserializer<Mozgoslav_Native_V1_DetectTargetRequest>(),
            serializer: ProtobufSerializer<Mozgoslav_Native_V1_InjectTarget>()
        ) { request, _ in
            let req = try request.message
            let reply = await self.service.detectInjectTarget(req)
            return reply
        }
    }
}

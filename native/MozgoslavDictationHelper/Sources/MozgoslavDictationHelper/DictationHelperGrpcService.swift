import Foundation
import GRPCCore
import DictationHelperCore

#if canImport(AVFoundation)
import AVFoundation
#endif

#if canImport(AppKit)
import AppKit
#endif

public final class DictationHelperGrpcService: Sendable {
    private let audioCapture: AudioCaptureService
    private let textInjector: TextInjectionService
    private let focusDetector: FocusedAppDetector
    private let hotkeyMonitor: HotkeyMonitor
    private let dumpHotkeyMonitor: HotkeyMonitor
    private let askCorpusHotkeyMonitor: HotkeyMonitor

    public init(
        audioCapture: AudioCaptureService,
        textInjector: TextInjectionService,
        focusDetector: FocusedAppDetector,
        hotkeyMonitor: HotkeyMonitor,
        dumpHotkeyMonitor: HotkeyMonitor,
        askCorpusHotkeyMonitor: HotkeyMonitor
    ) {
        self.audioCapture = audioCapture
        self.textInjector = textInjector
        self.focusDetector = focusDetector
        self.hotkeyMonitor = hotkeyMonitor
        self.dumpHotkeyMonitor = dumpHotkeyMonitor
        self.askCorpusHotkeyMonitor = askCorpusHotkeyMonitor
    }

    public func startCapture(
        _ request: Mozgoslav_Native_V1_StartCaptureRequest
    ) async throws -> Mozgoslav_Native_V1_CaptureStarted {
        let deviceId: String? = request.deviceId.isEmpty ? nil : request.deviceId
        let sampleRate = request.sampleRate > 0 ? Int(request.sampleRate) : 48_000
        try audioCapture.start(deviceId: deviceId, sampleRate: sampleRate)
        var reply = Mozgoslav_Native_V1_CaptureStarted()
        reply.started = true
        return reply
    }

    public func stopCapture(
        _ request: Mozgoslav_Native_V1_StopCaptureRequest
    ) async throws -> Mozgoslav_Native_V1_CaptureStopped {
        audioCapture.stop()
        var reply = Mozgoslav_Native_V1_CaptureStopped()
        reply.stopped = true
        return reply
    }

    public func startFileCapture(
        _ request: Mozgoslav_Native_V1_StartFileCaptureRequest,
        responseWriter: some AsyncWriter<Mozgoslav_Native_V1_PcmChunk>
    ) async throws {
        let sessionId = request.sessionID
        let outputPath = request.outputPath
        let sampleRate = request.sampleRate > 0 ? Int(request.sampleRate) : 16_000

        guard !sessionId.isEmpty, !outputPath.isEmpty else {
            throw GRPCError.invalidArgument("startFileCapture requires session_id and output_path")
        }

        let streamSessionId = request.streamSessionID.isEmpty ? nil : request.streamSessionID
        let chunkStream = AsyncStream<Data>.makeStream(bufferingPolicy: .unbounded)

        let onPcmFrame: ((Data) -> Void)?
        if streamSessionId != nil {
            let continuation = chunkStream.continuation
            onPcmFrame = { bytes in
                continuation.yield(bytes)
            }
        } else {
            onPcmFrame = nil
            chunkStream.continuation.finish()
        }

        try audioCapture.startFileCapture(
            sessionId: sessionId,
            outputPath: outputPath,
            sampleRate: sampleRate,
            onPcmFrame: onPcmFrame
        )

        for await pcmData in chunkStream.stream {
            var chunk = Mozgoslav_Native_V1_PcmChunk()
            chunk.samplesFloat32Le = pcmData
            chunk.sampleRate = Int32(sampleRate)
            try await responseWriter.write(chunk)
        }
    }

    public func stopFileCapture(
        _ request: Mozgoslav_Native_V1_StopFileCaptureRequest
    ) async throws -> Mozgoslav_Native_V1_FileCaptureStopped {
        let result = try audioCapture.stopFileCapture(sessionId: request.sessionID)
        var reply = Mozgoslav_Native_V1_FileCaptureStopped()
        reply.success = true
        reply.path = result.path
        reply.durationMs = Int64(result.durationMs)
        return reply
    }

    public func checkPermissions(
        _ request: Mozgoslav_Native_V1_PermissionCheckRequest
    ) async -> Mozgoslav_Native_V1_PermissionStatus {
        var reply = Mozgoslav_Native_V1_PermissionStatus()
        reply.microphone = PermissionProbe.microphoneStatus()
        reply.accessibility = PermissionProbe.accessibilityStatus()
        reply.inputMonitoring = PermissionProbe.inputMonitoringStatus()
        return reply
    }

    public func requestPermission(
        _ request: Mozgoslav_Native_V1_PermissionRequestRequest
    ) async -> Mozgoslav_Native_V1_PermissionGranted {
        let accessibility = PermissionProbe.requestAccessibility()
        let inputMonitoring = PermissionProbe.requestInputMonitoring()
        var openedAccessibility = false
        var openedInputMonitoring = false

        if !accessibility {
            PermissionProbe.openAccessibilitySettings()
            openedAccessibility = true
        }
        if !inputMonitoring {
            PermissionProbe.openInputMonitoringSettings()
            openedInputMonitoring = true
        }

        var reply = Mozgoslav_Native_V1_PermissionGranted()
        reply.accessibility = accessibility
        reply.inputMonitoring = inputMonitoring
        reply.openedAccessibilitySettings = openedAccessibility
        reply.openedInputMonitoringSettings = openedInputMonitoring
        return reply
    }

    public func injectText(
        _ request: Mozgoslav_Native_V1_InjectTextRequest
    ) async throws -> Mozgoslav_Native_V1_InjectResult {
        let focused = focusDetector.detect()
        let mode = request.mode.isEmpty ? "auto" : request.mode
        let strategy = InjectionStrategySelector.strategy(forBundleId: focused.bundleId, mode: mode)
        try textInjector.inject(text: request.text, strategy: strategy)
        var reply = Mozgoslav_Native_V1_InjectResult()
        reply.injected = Int32(request.text.count)
        reply.strategy = strategy.rawValue
        reply.bundleID = focused.bundleId ?? ""
        reply.appName = focused.appName ?? ""
        return reply
    }

    public func detectInjectTarget(
        _ request: Mozgoslav_Native_V1_DetectTargetRequest
    ) async -> Mozgoslav_Native_V1_InjectTarget {
        let focused = focusDetector.detect()
        let strategy = InjectionStrategySelector.strategy(forBundleId: focused.bundleId)
        var reply = Mozgoslav_Native_V1_InjectTarget()
        reply.bundleID = focused.bundleId ?? ""
        reply.appName = focused.appName ?? ""
        reply.useAx = strategy == .accessibility
        return reply
    }

    public func startHotkey(
        _ request: Mozgoslav_Native_V1_StartHotkeyRequest,
        responseWriter: some AsyncWriter<Mozgoslav_Native_V1_HotkeyEvent>
    ) async throws {
        try await streamHotkey(
            monitor: hotkeyMonitor,
            accelerator: request.accelerator,
            responseWriter: responseWriter
        )
    }

    public func stopHotkey(_ request: Mozgoslav_Native_V1_StopHotkeyRequest) async {
        hotkeyMonitor.stop()
    }

    public func startDumpHotkey(
        _ request: Mozgoslav_Native_V1_StartDumpHotkeyRequest,
        responseWriter: some AsyncWriter<Mozgoslav_Native_V1_HotkeyEvent>
    ) async throws {
        try await streamHotkey(
            monitor: dumpHotkeyMonitor,
            accelerator: request.accelerator,
            responseWriter: responseWriter
        )
    }

    public func stopDumpHotkey(_ request: Mozgoslav_Native_V1_StopDumpHotkeyRequest) async {
        dumpHotkeyMonitor.stop()
    }

    public func startAskCorpusHotkey(
        _ request: Mozgoslav_Native_V1_StartAskCorpusHotkeyRequest,
        responseWriter: some AsyncWriter<Mozgoslav_Native_V1_HotkeyEvent>
    ) async throws {
        try await streamHotkey(
            monitor: askCorpusHotkeyMonitor,
            accelerator: request.accelerator,
            responseWriter: responseWriter
        )
    }

    public func stopAskCorpusHotkey(_ request: Mozgoslav_Native_V1_StopAskCorpusHotkeyRequest) async {
        askCorpusHotkeyMonitor.stop()
    }

    public func runShortcut(
        _ request: Mozgoslav_Native_V1_RunShortcutRequest
    ) async -> Mozgoslav_Native_V1_RunShortcutResult {
        var reply = Mozgoslav_Native_V1_RunShortcutResult()

        guard !request.name.isEmpty else {
            reply.success = false
            reply.stderr = "shortcut name must not be empty"
            return reply
        }

        do {
            let (stdout, stderr) = try await runShortcutProcess(name: request.name, input: request.input)
            reply.success = stderr.isEmpty
            reply.stdout = stdout
            reply.stderr = stderr
        } catch {
            reply.success = false
            reply.stderr = error.localizedDescription
        }

        return reply
    }

    public func shutdown() async {
        hotkeyMonitor.stop()
        dumpHotkeyMonitor.stop()
        askCorpusHotkeyMonitor.stop()
        audioCapture.stop()
        exit(0)
    }

    private func streamHotkey(
        monitor: HotkeyMonitor,
        accelerator: String,
        responseWriter: some AsyncWriter<Mozgoslav_Native_V1_HotkeyEvent>
    ) async throws {
        let eventStream = AsyncStream<HotkeyPayload>.makeStream(bufferingPolicy: .unbounded)

        monitor.onEvent = { payload in
            eventStream.continuation.yield(payload)
        }
        monitor.start(accelerator: accelerator)

        for await payload in eventStream.stream {
            var event = Mozgoslav_Native_V1_HotkeyEvent()
            event.kind = payload.kind
            event.accelerator = payload.accelerator
            event.observedAt = payload.observedAt
            try await responseWriter.write(event)
        }
    }

    private func runShortcutProcess(name: String, input: String) async throws -> (String, String) {
        return try await withCheckedThrowingContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/shortcuts")
            process.arguments = ["run", name]

            let stdinPipe = Pipe()
            let stdoutPipe = Pipe()
            let stderrPipe = Pipe()

            process.standardInput = stdinPipe
            process.standardOutput = stdoutPipe
            process.standardError = stderrPipe

            do {
                try process.run()
            } catch {
                continuation.resume(throwing: error)
                return
            }

            if !input.isEmpty, let inputData = input.data(using: .utf8) {
                stdinPipe.fileHandleForWriting.write(inputData)
            }
            stdinPipe.fileHandleForWriting.closeFile()

            process.waitUntilExit()

            let stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
            let stderrData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
            let stdout = String(data: stdoutData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let stderr = String(data: stderrData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            continuation.resume(returning: (stdout, stderr))
        }
    }
}

struct GRPCError {
    static func invalidArgument(_ message: String) -> Error {
        NSError(
            domain: "GRPCError",
            code: 3,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
    }
}

public protocol AsyncWriter<Element>: Sendable {
    associatedtype Element
    func write(_ element: Element) async throws
}

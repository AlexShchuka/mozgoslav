import Foundation
import DictationHelperCore

#if canImport(AppKit)
import AppKit
#endif

public final class DictationHelper {
    private let stdin: FileHandle
    private let stdout: FileHandle
    private let audioCapture: AudioCaptureService
    private let textInjector: TextInjectionService
    private let focusDetector: FocusedAppDetector
    private let hotkeyMonitor: HotkeyMonitor
    private let dumpHotkeyMonitor: HotkeyMonitor
    private let askCorpusHotkeyMonitor: HotkeyMonitor
    private let writeQueue = DispatchQueue(label: "mozgoslav.helper.stdout")
    private let pcmUploader: BackendPcmUploader

    public init(
        stdin: FileHandle = .standardInput,
        stdout: FileHandle = .standardOutput
    ) {
        self.stdin = stdin
        self.stdout = stdout
        self.audioCapture = AudioCaptureService()
        self.textInjector = TextInjectionService()
        self.focusDetector = FocusedAppDetector()
        self.hotkeyMonitor = HotkeyMonitor()
        self.dumpHotkeyMonitor = HotkeyMonitor()
        self.askCorpusHotkeyMonitor = HotkeyMonitor()
        self.pcmUploader = BackendPcmUploader()
    }

    public func run() {
        probeAndRequestPermissionsAtStartup()

        audioCapture.onAudioChunk = { [weak self] chunk in
            self?.emit(event: "audio", params: .object([
                "samples": .array(chunk.samples.map { .double(Double($0)) }),
                "sampleRate": .int(chunk.sampleRate),
                "offsetMs": .int(chunk.offsetMs),
            ]))
        }

        hotkeyMonitor.onEvent = { [weak self] payload in
            FileLog.shared.info("DictationHelper: emit hotkey kind=\(payload.kind)")
            self?.emit(event: "hotkey", params: .object([
                "kind": .string(payload.kind),
                "accelerator": .string(payload.accelerator),
                "observedAt": .string(payload.observedAt),
            ]))
        }

        dumpHotkeyMonitor.onEvent = { [weak self] payload in
            FileLog.shared.info("DictationHelper: emit dumpHotkey kind=\(payload.kind)")
            self?.emit(event: "dumpHotkey", params: .object([
                "kind": .string(payload.kind),
                "accelerator": .string(payload.accelerator),
                "observedAt": .string(payload.observedAt),
            ]))
        }

        askCorpusHotkeyMonitor.onEvent = { [weak self] payload in
            FileLog.shared.info("DictationHelper: emit askCorpus kind=\(payload.kind)")
            self?.emit(event: "askCorpus", params: .object([
                "kind": .string(payload.kind),
                "accelerator": .string(payload.accelerator),
                "observedAt": .string(payload.observedAt),
            ]))
        }

        while let line = stdin.readLine() {
            guard !line.isEmpty else { continue }
            handle(line: line)
        }
    }

    private func probeAndRequestPermissionsAtStartup() {
        let mic = PermissionProbe.microphoneStatus()
        let ax = PermissionProbe.accessibilityStatus()
        let im = PermissionProbe.inputMonitoringStatus()
        FileLog.shared.info("DictationHelper startup: mic=\(mic) accessibility=\(ax) inputMonitoring=\(im)")

        let markerPath = (NSHomeDirectory() as NSString)
            .appendingPathComponent("Library/Application Support/Mozgoslav/.helper-permissions-probed")
        let isFirstLaunch = !FileManager.default.fileExists(atPath: markerPath)

        if ax != "granted" {
            let granted = PermissionProbe.requestAccessibility()
            FileLog.shared.info(
                "DictationHelper startup: requestAccessibility returned \(granted) firstLaunch=\(isFirstLaunch)"
            )
            if !granted && !isFirstLaunch {
                DispatchQueue.main.async {
                    PermissionProbe.openAccessibilitySettings()
                }
                FileLog.shared.info(
                    "DictationHelper startup: opened Accessibility settings (TCC prompt likely suppressed)"
                )
            }
        }
        if im != "granted" {
            let granted = PermissionProbe.requestInputMonitoring()
            FileLog.shared.info(
                "DictationHelper startup: requestInputMonitoring returned \(granted) firstLaunch=\(isFirstLaunch)"
            )
            if !granted && !isFirstLaunch {
                DispatchQueue.main.async {
                    PermissionProbe.openInputMonitoringSettings()
                }
                FileLog.shared.info(
                    "DictationHelper startup: opened Input Monitoring settings (TCC prompt likely suppressed)"
                )
            }
        }

        let markerDir = (markerPath as NSString).deletingLastPathComponent
        try? FileManager.default.createDirectory(
            atPath: markerDir,
            withIntermediateDirectories: true
        )
        FileManager.default.createFile(atPath: markerPath, contents: Data())
    }

    private func handle(line: String) {
        let request: JsonRpcRequest
        do {
            request = try JsonRpcCodec.decodeRequest(line)
        } catch {
            return
        }

        let response: JsonRpcResponse
        do {
            response = try dispatch(request)
        } catch let helperError as HelperError {
            response = JsonRpcResponse(
                id: request.id,
                error: JsonRpcError(code: helperError.code, message: helperError.message)
            )
        } catch {
            response = JsonRpcResponse(
                id: request.id,
                error: JsonRpcError(code: -32000, message: error.localizedDescription)
            )
        }

        respond(response)
    }

    private func dispatch(_ request: JsonRpcRequest) throws -> JsonRpcResponse {
        switch request.method {
        case "capture.start":
            let params = request.params?.objectValue() ?? [:]
            let deviceId = params["deviceId"]?.stringValue()
            let sampleRate = params["sampleRate"]?.intValue() ?? 48_000
            try audioCapture.start(deviceId: deviceId, sampleRate: sampleRate)
            return JsonRpcResponse(id: request.id, result: .object(["started": .bool(true)]))

        case "capture.stop":
            audioCapture.stop()
            return JsonRpcResponse(id: request.id, result: .object(["stopped": .bool(true)]))

        case "capture.startFile":
            let params = request.params?.objectValue() ?? [:]
            let sessionId = params["sessionId"]?.stringValue() ?? ""
            let outputPath = params["outputPath"]?.stringValue() ?? ""
            let sampleRate = params["sampleRate"]?.intValue() ?? 16_000
            let streamSessionId = params["streamSessionId"]?.stringValue()
            let backendBaseUrl = params["backendBaseUrl"]?.stringValue()
            guard !sessionId.isEmpty, !outputPath.isEmpty else {
                throw HelperError(code: -32602, message: "capture.startFile requires sessionId and outputPath")
            }
            let onPcmFrame: ((Data) -> Void)?
            if let id = streamSessionId,
               let baseUrl = backendBaseUrl,
               !id.isEmpty,
               !baseUrl.isEmpty {
                let uploader = pcmUploader
                onPcmFrame = { bytes in
                    uploader.upload(streamSessionId: id, baseUrl: baseUrl, payload: bytes)
                }
                FileLog.shared.info(
                    "capture.startFile: streaming enabled streamSessionId=\(id) backendBaseUrl=\(baseUrl)"
                )
            } else {
                onPcmFrame = nil
            }
            try audioCapture.startFileCapture(
                sessionId: sessionId,
                outputPath: outputPath,
                sampleRate: sampleRate,
                onPcmFrame: onPcmFrame
            )
            return JsonRpcResponse(id: request.id, result: .object([
                "started": .bool(true),
                "sessionId": .string(sessionId),
                "streaming": .bool(onPcmFrame != nil),
            ]))

        case "capture.stopFile":
            let params = request.params?.objectValue() ?? [:]
            let sessionId = params["sessionId"]?.stringValue() ?? ""
            let result = try audioCapture.stopFileCapture(sessionId: sessionId)
            return JsonRpcResponse(id: request.id, result: .object([
                "success": .bool(true),
                "path": .string(result.path),
                "durationMs": .int(result.durationMs),
            ]))

        case "permission.check":
            let microphone = PermissionProbe.microphoneStatus()
            let accessibility = PermissionProbe.accessibilityStatus()
            let inputMonitoring = PermissionProbe.inputMonitoringStatus()
            return JsonRpcResponse(id: request.id, result: .object([
                "microphone": .string(microphone),
                "accessibility": .string(accessibility),
                "inputMonitoring": .string(inputMonitoring),
            ]))

        case "permission.request":
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
            return JsonRpcResponse(id: request.id, result: .object([
                "accessibility": .bool(accessibility),
                "inputMonitoring": .bool(inputMonitoring),
                "openedAccessibilitySettings": .bool(openedAccessibility),
                "openedInputMonitoringSettings": .bool(openedInputMonitoring),
            ]))

        case "inject.text":
            let params = request.params?.objectValue() ?? [:]
            let text = params["text"]?.stringValue() ?? ""
            let mode = params["mode"]?.stringValue() ?? "auto"
            let focused = focusDetector.detect()
            let strategy = InjectionStrategySelector.strategy(forBundleId: focused.bundleId, mode: mode)
            try textInjector.inject(text: text, strategy: strategy)
            return JsonRpcResponse(id: request.id, result: .object([
                "injected": .int(text.count),
                "strategy": .string(strategy.rawValue),
                "bundleId": .string(focused.bundleId ?? ""),
                "appName": .string(focused.appName ?? ""),
            ]))

        case "inject.detectTarget":
            let focused = focusDetector.detect()
            let strategy = InjectionStrategySelector.strategy(forBundleId: focused.bundleId)
            return JsonRpcResponse(id: request.id, result: .object([
                "bundleId": .string(focused.bundleId ?? ""),
                "appName": .string(focused.appName ?? ""),
                "useAX": .bool(strategy == .accessibility),
            ]))

        case "hotkey.start":
            let params = request.params?.objectValue() ?? [:]
            let accelerator = params["accelerator"]?.stringValue() ?? ""
            hotkeyMonitor.start(accelerator: accelerator)
            return JsonRpcResponse(id: request.id, result: .object([
                "started": .bool(!accelerator.isEmpty),
                "accelerator": .string(accelerator),
            ]))

        case "hotkey.stop":
            hotkeyMonitor.stop()
            return JsonRpcResponse(id: request.id, result: .object(["stopped": .bool(true)]))

        case "dumpHotkey.start":
            let params = request.params?.objectValue() ?? [:]
            let accelerator = params["accelerator"]?.stringValue() ?? ""
            dumpHotkeyMonitor.start(accelerator: accelerator)
            return JsonRpcResponse(id: request.id, result: .object([
                "started": .bool(!accelerator.isEmpty),
                "accelerator": .string(accelerator),
            ]))

        case "dumpHotkey.stop":
            dumpHotkeyMonitor.stop()
            return JsonRpcResponse(id: request.id, result: .object(["stopped": .bool(true)]))

        case "askCorpusHotkey.start":
            let params = request.params?.objectValue() ?? [:]
            let accelerator = params["accelerator"]?.stringValue() ?? ""
            askCorpusHotkeyMonitor.start(accelerator: accelerator)
            return JsonRpcResponse(id: request.id, result: .object([
                "started": .bool(!accelerator.isEmpty),
                "accelerator": .string(accelerator),
            ]))

        case "askCorpusHotkey.stop":
            askCorpusHotkeyMonitor.stop()
            return JsonRpcResponse(id: request.id, result: .object(["stopped": .bool(true)]))

        case "shutdown":
            hotkeyMonitor.stop()
            dumpHotkeyMonitor.stop()
            askCorpusHotkeyMonitor.stop()
            audioCapture.stop()
            exit(0)

        default:
            throw HelperError(code: -32601, message: "Unknown method: \(request.method)")
        }
    }

    private func respond(_ response: JsonRpcResponse) {
        writeQueue.async { [self] in
            do {
                let line = try JsonRpcCodec.encode(response) + "\n"
                if let data = line.data(using: .utf8) {
                    stdout.write(data)
                }
            } catch {
            }
        }
    }

    private func emit(event: String, params: JsonValue) {
        let notification = JsonRpcResponse(
            id: "event.\(event)",
            result: .object([
                "event": .string(event),
                "params": params,
            ])
        )
        respond(notification)
    }
}

struct HelperError: Error {
    let code: Int
    let message: String
}

private extension FileHandle {
    func readLine() -> String? {
        var buffer = Data()
        while true {
            let chunk = self.availableData
            if chunk.isEmpty { return buffer.isEmpty ? nil : String(data: buffer, encoding: .utf8) }
            if let newlineIndex = chunk.firstIndex(of: 0x0A) {
                buffer.append(chunk.prefix(upTo: newlineIndex))
                return String(data: buffer, encoding: .utf8)
            } else {
                buffer.append(chunk)
            }
        }
    }
}

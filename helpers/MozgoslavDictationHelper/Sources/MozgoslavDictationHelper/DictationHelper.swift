import Foundation
import DictationHelperCore

#if canImport(AppKit)
import AppKit
#endif

/// Top-level coordinator for the helper process. Reads JSON-RPC requests line
/// by line from stdin and dispatches each to the matching service. Services
/// are stateful (mic capture) or stateless (text injection) — this class is
/// the only place that knows about both.
public final class DictationHelper {
    private let stdin: FileHandle
    private let stdout: FileHandle
    private let audioCapture: AudioCaptureService
    private let textInjector: TextInjectionService
    private let focusDetector: FocusedAppDetector

    public init(
        stdin: FileHandle = .standardInput,
        stdout: FileHandle = .standardOutput
    ) {
        self.stdin = stdin
        self.stdout = stdout
        self.audioCapture = AudioCaptureService()
        self.textInjector = TextInjectionService()
        self.focusDetector = FocusedAppDetector()
    }

    public func run() {
        audioCapture.onAudioChunk = { [weak self] chunk in
            self?.emit(event: "audio", params: .object([
                "samples": .array(chunk.map { .double(Double($0)) }),
                "sampleRate": .int(chunk.sampleRate),
                "offsetMs": .int(chunk.offsetMs),
            ]))
        }

        while let line = stdin.readLine() {
            guard !line.isEmpty else { continue }
            handle(line: line)
        }
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
            ]))

        case "inject.detectTarget":
            let focused = focusDetector.detect()
            let strategy = InjectionStrategySelector.strategy(forBundleId: focused.bundleId)
            return JsonRpcResponse(id: request.id, result: .object([
                "bundleId": .string(focused.bundleId ?? ""),
                "appName": .string(focused.appName ?? ""),
                "useAX": .bool(strategy == .accessibility),
            ]))

        case "shutdown":
            audioCapture.stop()
            exit(0)

        default:
            throw HelperError(code: -32601, message: "Unknown method: \(request.method)")
        }
    }

    private func respond(_ response: JsonRpcResponse) {
        do {
            let line = try JsonRpcCodec.encode(response) + "\n"
            if let data = line.data(using: .utf8) {
                stdout.write(data)
            }
        } catch {
            // Best effort — if encoding fails we cannot signal the error
            // back via the same channel; swallow and keep the loop alive.
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

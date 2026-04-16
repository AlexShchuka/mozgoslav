import Foundation

#if canImport(AVFoundation)
import AVFoundation
#endif

/// Captures audio from the default or user-selected microphone at 48 kHz and
/// downsamples to 16 kHz mono PCM (the format Whisper.net consumes). Emits
/// chunks as they arrive — the Electron main receives them over JSON-RPC and
/// forwards to the backend `/api/dictation/push/{sessionId}` endpoint.
///
/// macOS implementation uses AVAudioEngine + AVAudioConverter. On non-macOS
/// platforms (CI linting, unit-test host) the service is a no-op placeholder —
/// the helper binary itself only runs on macOS so this never ships.
public final class AudioCaptureService {
    public struct Chunk {
        public let samples: [Float]
        public let sampleRate: Int
        public let offsetMs: Int
    }

    public var onAudioChunk: ((Chunk) -> Void)?

    #if canImport(AVFoundation)
    private let engine = AVAudioEngine()
    private var converter: AVAudioConverter?
    private var startedAt: Date?
    private var isRunning = false
    private let targetSampleRate: Double = 16_000
    #endif

    public init() {}

    public func start(deviceId: String?, sampleRate: Int) throws {
        #if canImport(AVFoundation)
        guard !isRunning else { return }
        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)

        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: targetSampleRate,
            channels: 1,
            interleaved: false
        ) else {
            throw HelperError(code: -32010, message: "Failed to create target audio format")
        }

        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            throw HelperError(code: -32011, message: "Failed to create audio converter")
        }
        self.converter = converter
        self.startedAt = Date()

        input.installTap(onBus: 0, bufferSize: 4_800, format: inputFormat) { [weak self] buffer, _ in
            self?.process(buffer: buffer, targetFormat: targetFormat)
        }

        try engine.start()
        isRunning = true
        #else
        _ = deviceId
        _ = sampleRate
        throw HelperError(code: -32020, message: "Audio capture is only available on macOS")
        #endif
    }

    public func stop() {
        #if canImport(AVFoundation)
        guard isRunning else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        converter = nil
        startedAt = nil
        isRunning = false
        #endif
    }

    #if canImport(AVFoundation)
    private func process(buffer: AVAudioPCMBuffer, targetFormat: AVAudioFormat) {
        guard let converter = converter else { return }

        let ratio = targetFormat.sampleRate / buffer.format.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 32
        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: targetFormat,
            frameCapacity: outputFrameCapacity
        ) else { return }

        var error: NSError?
        var consumed = false
        let status = converter.convert(to: outputBuffer, error: &error) { _, inputStatus in
            if consumed {
                inputStatus.pointee = .noDataNow
                return nil
            }
            consumed = true
            inputStatus.pointee = .haveData
            return buffer
        }

        guard status != .error, outputBuffer.frameLength > 0 else { return }
        guard let channelData = outputBuffer.floatChannelData?.pointee else { return }

        let frameCount = Int(outputBuffer.frameLength)
        var samples = [Float](repeating: 0, count: frameCount)
        for i in 0..<frameCount {
            samples[i] = channelData[i]
        }

        let offsetMs: Int
        if let startedAt = startedAt {
            offsetMs = Int(Date().timeIntervalSince(startedAt) * 1_000)
        } else {
            offsetMs = 0
        }

        onAudioChunk?(Chunk(samples: samples, sampleRate: Int(targetFormat.sampleRate), offsetMs: offsetMs))
    }
    #endif
}

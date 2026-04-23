import Foundation

#if canImport(AVFoundation)
import AVFoundation
#endif

/// Captures audio from the default input and emits 16 kHz mono float32 PCM
/// chunks — the format Whisper.net consumes directly on the backend side.
///
/// ## Graph
///
///     engine.inputNode ──(inputFormat, any channels)──▶ mixer ──(tap: 16 kHz mono)──▶ onAudioChunk
///
/// An `AVAudioMixerNode` is inserted between the input node and the tap
/// instead of handling conversion in a callback with `AVAudioConverter`.
/// The mixer is the only Apple-sanctioned path that simultaneously
///
///   * **sums** all input channels into mono. A bare `AVAudioConverter`
///     without an explicit `AudioChannelLayout` / `channelMap` picks
///     channel 0 when downmixing N→1, and on macOS *aggregate* input
///     devices (e.g. «камера + наушники») channel 0 is often a silent
///     loopback/monitor channel — the real microphone lives on a higher
///     index. The mixer sums every channel together, so the signal
///     survives no matter which sub-device is carrying it;
///   * resamples to the tap format's `sampleRate` in a single pass using
///     the mixer's internal resampler.
///
/// `engine.prepare()` is called before `engine.start()` to avoid the
/// intermittent macOS bug where the first few input buffers arrive silent
/// on certain Core Audio configurations.
///
/// On non-macOS platforms (CI linting, unit-test host) the service is a
/// no-op placeholder — the helper binary itself only runs on macOS so this
/// never ships.
///
/// References:
///   * https://developer.apple.com/documentation/avfaudio/avaudiomixernode
///   * https://github.com/AudioKit/AudioKit/issues/2130 — AVAudioEngine
///     aggregate-device limitations that motivated the mixer-based pattern.
///   * https://developer.apple.com/forums/thread/771048 — zero-samples
///     diagnosis checklist (sandbox `Audio Input` entitlement is still
///     required when the helper ships inside a sandboxed DMG).
public final class AudioCaptureService {
    public struct Chunk {
        public let samples: [Float]
        public let sampleRate: Int
        public let offsetMs: Int
    }

    public var onAudioChunk: ((Chunk) -> Void)?

    #if canImport(AVFoundation)
    private let engine = AVAudioEngine()
    private let mixer = AVAudioMixerNode()
    private var startedAt: Date?
    private var isRunning = false
    private var firstChunkLogged = false
    private let targetSampleRate: Double = 16_000
    #endif

    public init() {
        #if canImport(AVFoundation)
        engine.attach(mixer)
        #endif
    }

    public func start(deviceId: String?, sampleRate: Int) throws {
        #if canImport(AVFoundation)
        guard !isRunning else { return }
        guard fileSessions.isEmpty else {
            throw HelperError(
                code: -32022,
                message: "Audio streaming cannot start while \(fileSessions.count) file-capture session(s) are active."
            )
        }
        firstChunkLogged = false

        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        FileLog.shared.info(
            "AudioCaptureService: start inputFormat sampleRate=\(inputFormat.sampleRate) channels=\(inputFormat.channelCount) interleaved=\(inputFormat.isInterleaved)"
        )

        guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
            throw HelperError(
                code: -32030,
                message: "Default input device reports invalid format (sampleRate=\(inputFormat.sampleRate), channels=\(inputFormat.channelCount)). Select a valid microphone in System Settings → Sound → Input."
            )
        }

        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: targetSampleRate,
            channels: 1,
            interleaved: false
        ) else {
            throw HelperError(code: -32010, message: "Failed to create target audio format")
        }

        engine.connect(input, to: mixer, format: inputFormat)

        mixer.installTap(onBus: 0, bufferSize: 4_800, format: targetFormat) { [weak self] buffer, _ in
            self?.emitChunk(from: buffer)
        }

        engine.prepare()

        do {
            try engine.start()
        } catch {
            mixer.removeTap(onBus: 0)
            engine.disconnectNodeInput(mixer)
            throw error
        }

        startedAt = Date()
        isRunning = true
        _ = deviceId
        _ = sampleRate
        #else
        _ = deviceId
        _ = sampleRate
        throw HelperError(code: -32020, message: "Audio capture is only available on macOS")
        #endif
    }

    public func stop() {
        #if canImport(AVFoundation)
        guard isRunning else { return }
        mixer.removeTap(onBus: 0)
        engine.stop()
        engine.disconnectNodeInput(mixer)
        startedAt = nil
        isRunning = false
        #endif
    }


    #if canImport(AVFoundation)
    private final class FileSession {
        let sessionId: String
        let outputPath: String
        var file: AVAudioFile?
        let startedAt: Date
        var stopped = false

        init(sessionId: String, outputPath: String, file: AVAudioFile, startedAt: Date) {
            self.sessionId = sessionId
            self.outputPath = outputPath
            self.file = file
            self.startedAt = startedAt
        }
    }

    private var fileSessions: [String: FileSession] = [:]
    #endif

    public func startFileCapture(sessionId: String, outputPath: String, sampleRate: Int) throws {
        #if canImport(AVFoundation)
        guard !isRunning else {
            throw HelperError(
                code: -32023,
                message: "File capture cannot start while streaming capture is active."
            )
        }
        FileLog.shared.info(
            "startFileCapture enter sessionId=\(sessionId) outputPath=\(outputPath) sampleRate=\(sampleRate)"
        )

        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
            throw HelperError(
                code: -32030,
                message: "Default input device reports invalid format (sampleRate=\(inputFormat.sampleRate), channels=\(inputFormat.channelCount)). Select a valid microphone in System Settings → Sound → Input."
            )
        }

        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: Double(sampleRate),
            channels: 1,
            interleaved: false
        ) else {
            throw HelperError(code: -32010, message: "Failed to create target audio format for file capture")
        }

        let url = URL(fileURLWithPath: outputPath)
        let parent = url.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: parent, withIntermediateDirectories: true)

        let file = try AVAudioFile(
            forWriting: url,
            settings: targetFormat.settings,
            commonFormat: .pcmFormatFloat32,
            interleaved: false
        )

        let session = FileSession(
            sessionId: sessionId,
            outputPath: outputPath,
            file: file,
            startedAt: Date()
        )
        fileSessions[sessionId] = session

        if !engine.isRunning {
            engine.connect(input, to: mixer, format: inputFormat)
            mixer.installTap(onBus: 0, bufferSize: 4_800, format: targetFormat) { [weak self] buffer, _ in
                self?.writeToFiles(buffer: buffer)
            }
            engine.prepare()
            do {
                try engine.start()
            } catch {
                mixer.removeTap(onBus: 0)
                engine.disconnectNodeInput(mixer)
                fileSessions.removeValue(forKey: sessionId)
                throw error
            }
        }
        #else
        _ = sessionId
        _ = outputPath
        _ = sampleRate
        throw HelperError(code: -32020, message: "File capture is macOS-only")
        #endif
    }

    public func stopFileCapture(sessionId: String) throws -> (path: String, durationMs: Int) {
        #if canImport(AVFoundation)
        guard let session = fileSessions.removeValue(forKey: sessionId) else {
            throw HelperError(code: -32021, message: "Unknown file-capture sessionId: \(sessionId)")
        }
        session.stopped = true
        let durationMs = Int(Date().timeIntervalSince(session.startedAt) * 1000)

        if fileSessions.isEmpty && !isRunning {
            mixer.removeTap(onBus: 0)
            engine.stop()
            engine.disconnectNodeInput(mixer)
        }

        session.file = nil

        let size = (try? FileManager.default
            .attributesOfItem(atPath: session.outputPath)[.size] as? NSNumber)?.int64Value ?? -1
        FileLog.shared.info(
            "stopFileCapture done sessionId=\(sessionId) outputPath=\(session.outputPath) size=\(size) durationMs=\(durationMs)"
        )

        return (session.outputPath, durationMs)
        #else
        _ = sessionId
        throw HelperError(code: -32020, message: "File capture is macOS-only")
        #endif
    }

    #if canImport(AVFoundation)
    private func emitChunk(from buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?.pointee else { return }
        let frameCount = Int(buffer.frameLength)
        if frameCount == 0 {
            return
        }

        var samples = [Float](repeating: 0, count: frameCount)
        for i in 0..<frameCount {
            samples[i] = channelData[i]
        }

        if !firstChunkLogged {
            var sumSq: Double = 0
            var minV: Float = samples[0]
            var maxV: Float = samples[0]
            for v in samples {
                sumSq += Double(v) * Double(v)
                if v < minV { minV = v }
                if v > maxV { maxV = v }
            }
            let rms = (sumSq / Double(frameCount)).squareRoot()
            FileLog.shared.info(
                "AudioCaptureService: first chunk emitted frames=\(frameCount) rms=\(rms) min=\(minV) max=\(maxV) outputSR=\(Int(targetSampleRate))"
            )
            firstChunkLogged = true
        }

        let offsetMs: Int
        if let startedAt = startedAt {
            offsetMs = Int(Date().timeIntervalSince(startedAt) * 1_000)
        } else {
            offsetMs = 0
        }

        onAudioChunk?(Chunk(samples: samples, sampleRate: Int(targetSampleRate), offsetMs: offsetMs))
    }

    private func writeToFiles(buffer: AVAudioPCMBuffer) {
        for session in fileSessions.values where !session.stopped {
            if let file = session.file {
                try? file.write(from: buffer)
            }
        }
    }
    #endif
}

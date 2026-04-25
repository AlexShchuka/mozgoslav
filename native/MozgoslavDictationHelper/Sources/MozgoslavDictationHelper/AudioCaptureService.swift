import Foundation

#if canImport(AVFoundation)
import AVFoundation
#endif

public final class AudioCaptureService {
    public struct Chunk {
        public let samples: [Float]
        public let sampleRate: Int
        public let offsetMs: Int

        public init(samples: [Float], sampleRate: Int, offsetMs: Int) {
            self.samples = samples
            self.sampleRate = sampleRate
            self.offsetMs = offsetMs
        }
    }

    public var onAudioChunk: ((Chunk) -> Void)?

    #if canImport(AVFoundation)
    private let engine = AVAudioEngine()
    private let mixer = AVAudioMixerNode()
    private var sink: AVAudioSinkNode?
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

        let sinkNode = AVAudioSinkNode { [weak self] _, frameCount, audioBufferList -> OSStatus in
            self?.handleSinkFrames(frameCount: frameCount, audioBufferList: audioBufferList)
            return noErr
        }
        engine.attach(sinkNode)
        sink = sinkNode

        engine.connect(input, to: mixer, format: inputFormat)
        engine.connect(mixer, to: sinkNode, format: targetFormat)

        engine.prepare()

        do {
            try engine.start()
        } catch {
            tearDownStreamingGraph()
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
        engine.stop()
        tearDownStreamingGraph()
        startedAt = nil
        isRunning = false
        #endif
    }

    #if canImport(AVFoundation)
    private func tearDownStreamingGraph() {
        engine.disconnectNodeInput(mixer)
        if let sinkNode = sink {
            engine.disconnectNodeInput(sinkNode)
            engine.detach(sinkNode)
            sink = nil
        }
    }

    private func handleSinkFrames(
        frameCount: AVAudioFrameCount,
        audioBufferList: UnsafePointer<AudioBufferList>
    ) {
        let count = Int(frameCount)
        if count == 0 {
            return
        }

        let abl = UnsafeMutableAudioBufferListPointer(
            UnsafeMutablePointer(mutating: audioBufferList)
        )
        guard abl.count > 0, let rawPtr = abl[0].mData else { return }
        let floatPtr = rawPtr.assumingMemoryBound(to: Float.self)

        var samples = [Float](repeating: 0, count: count)
        for i in 0..<count {
            samples[i] = floatPtr[i]
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
            let rms = (sumSq / Double(count)).squareRoot()
            FileLog.shared.info(
                "AudioCaptureService: first chunk emitted frames=\(count) rms=\(rms) min=\(minV) max=\(maxV) outputSR=\(Int(targetSampleRate))"
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
    #endif

    #if canImport(AVFoundation)
    private final class FileSession {
        let sessionId: String
        let outputPath: String
        var file: AVAudioFile?
        let startedAt: Date
        var stopped = false
        let onPcmFrame: ((Data) -> Void)?

        init(
            sessionId: String,
            outputPath: String,
            file: AVAudioFile,
            startedAt: Date,
            onPcmFrame: ((Data) -> Void)?
        ) {
            self.sessionId = sessionId
            self.outputPath = outputPath
            self.file = file
            self.startedAt = startedAt
            self.onPcmFrame = onPcmFrame
        }
    }

    private var fileSessions: [String: FileSession] = [:]
    #endif

    public func startFileCapture(
        sessionId: String,
        outputPath: String,
        sampleRate: Int,
        onPcmFrame: ((Data) -> Void)? = nil
    ) throws {
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

        guard let sessionConverter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            throw HelperError(code: -32011, message: "Failed to create audio converter for file capture")
        }

        let session = FileSession(
            sessionId: sessionId,
            outputPath: outputPath,
            file: file,
            startedAt: Date(),
            onPcmFrame: onPcmFrame
        )
        fileSessions[sessionId] = session

        if !engine.isRunning {
            input.installTap(onBus: 0, bufferSize: 4_800, format: inputFormat) { [weak self] buffer, _ in
                self?.writeToFiles(buffer: buffer, converter: sessionConverter, targetFormat: targetFormat)
            }
            engine.prepare()
            do {
                try engine.start()
            } catch {
                engine.inputNode.removeTap(onBus: 0)
                fileSessions.removeValue(forKey: sessionId)
                throw error
            }
        }
        #else
        _ = sessionId
        _ = outputPath
        _ = sampleRate
        _ = onPcmFrame
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
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
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
    private func writeToFiles(
        buffer: AVAudioPCMBuffer,
        converter: AVAudioConverter,
        targetFormat: AVAudioFormat
    ) {
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

        var pcmFrameData: Data?
        let activeStreamingSessions = fileSessions.values.contains { !$0.stopped && $0.onPcmFrame != nil }
        if activeStreamingSessions {
            let frameCount = Int(outputBuffer.frameLength)
            if let channelData = outputBuffer.floatChannelData?.pointee {
                let byteCount = frameCount * MemoryLayout<Float>.size
                pcmFrameData = Data(bytes: channelData, count: byteCount)
            }
        }

        for session in fileSessions.values where !session.stopped {
            if let file = session.file {
                try? file.write(from: outputBuffer)
            }
            if let onPcmFrame = session.onPcmFrame, let payload = pcmFrameData {
                onPcmFrame(payload)
            }
        }
    }
    #endif
}

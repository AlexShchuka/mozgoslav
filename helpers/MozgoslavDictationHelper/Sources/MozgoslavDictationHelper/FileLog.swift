import Foundation

/// D1 — structured file log for dictation handoff diagnostics.
///
/// Writes newline-delimited JSON-ish entries to a per-session log file under
/// `~/Library/Logs/Mozgoslav/helper-YYYYMMDD.log`. The backend side of the
/// handoff logs the same `outputPath` / size pair via Serilog so a D1 repro
/// can be correlated end-to-end (Swift helper start → AVAudioFile stop →
/// Electron bridge → backend stop → ImportRecordingUseCase).
///
/// Failures are swallowed — logging must never block the capture path.
public final class FileLog {
    public static let shared = FileLog()

    private let queue = DispatchQueue(label: "mozgoslav.helper.filelog")
    private let dateFormatter: DateFormatter
    private let isoFormatter: ISO8601DateFormatter

    private init() {
        let df = DateFormatter()
        df.dateFormat = "yyyyMMdd"
        df.locale = Locale(identifier: "en_US_POSIX")
        self.dateFormatter = df
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        self.isoFormatter = iso
    }

    public func info(_ message: String) {
        append(level: "INF", message: message)
    }

    public func warn(_ message: String) {
        append(level: "WRN", message: message)
    }

    private func append(level: String, message: String) {
        queue.async { [self] in
            let now = Date()
            guard let logsDir = logsDirectory() else { return }
            let logFile = logsDir.appendingPathComponent(
                "helper-\(dateFormatter.string(from: now)).log"
            )
            let line = "[\(isoFormatter.string(from: now))] [\(level)] \(message)\n"
            try? FileManager.default.createDirectory(at: logsDir, withIntermediateDirectories: true)
            if let data = line.data(using: .utf8) {
                if FileManager.default.fileExists(atPath: logFile.path) {
                    if let handle = try? FileHandle(forWritingTo: logFile) {
                        defer { try? handle.close() }
                        _ = try? handle.seekToEnd()
                        try? handle.write(contentsOf: data)
                    }
                } else {
                    try? data.write(to: logFile)
                }
            }
        }
    }

    private func logsDirectory() -> URL? {
        guard let home = ProcessInfo.processInfo.environment["HOME"] else { return nil }
        return URL(fileURLWithPath: home)
            .appendingPathComponent("Library")
            .appendingPathComponent("Logs")
            .appendingPathComponent("Mozgoslav")
    }
}

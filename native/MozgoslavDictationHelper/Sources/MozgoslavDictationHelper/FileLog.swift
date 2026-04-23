import Foundation

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
            let line = "[\(isoFormatter.string(from: now))] [\(level)] \(message)\n"
            if let data = line.data(using: .utf8) {
                FileHandle.standardError.write(data)
            }
            guard let logsDir = logsDirectory() else { return }
            let logFile = logsDir.appendingPathComponent(
                "helper-\(dateFormatter.string(from: now)).log"
            )
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

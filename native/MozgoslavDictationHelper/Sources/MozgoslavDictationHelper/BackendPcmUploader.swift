import Foundation

public final class BackendPcmUploader {
    private let session: URLSession
    private let queue = DispatchQueue(label: "mozgoslav.helper.pcm-upload", qos: .utility)
    private var firstUploadLogged = false
    private var loggedFailureKeys: Set<String> = []

    public init() {
        let configuration = URLSessionConfiguration.default
        configuration.httpMaximumConnectionsPerHost = 4
        configuration.timeoutIntervalForRequest = 5
        configuration.waitsForConnectivity = false
        self.session = URLSession(configuration: configuration)
    }

    public func upload(streamSessionId: String, baseUrl: String, payload: Data) {
        guard let url = buildEndpoint(baseUrl: baseUrl, streamSessionId: streamSessionId) else {
            queue.async { [weak self] in
                self?.logFailureOnce(
                    key: "invalid-url",
                    message: "BackendPcmUploader: invalid endpoint baseUrl=\(baseUrl) streamSessionId=\(streamSessionId)"
                )
            }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("audio/pcm", forHTTPHeaderField: "Content-Type")
        let payloadCount = payload.count

        let task = session.uploadTask(with: request, from: payload) { [weak self] _, response, error in
            guard let self = self else { return }
            self.queue.async {
                if let error = error {
                    self.logFailureOnce(
                        key: "transport",
                        message: "BackendPcmUploader: upload failed url=\(url.absoluteString) error=\(error.localizedDescription)"
                    )
                    return
                }
                if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
                    self.logFailureOnce(
                        key: "http-\(http.statusCode)",
                        message: "BackendPcmUploader: upload http \(http.statusCode) url=\(url.absoluteString)"
                    )
                    return
                }
                if !self.firstUploadLogged {
                    self.firstUploadLogged = true
                    FileLog.shared.info(
                        "BackendPcmUploader: first chunk delivered bytes=\(payloadCount) url=\(url.absoluteString)"
                    )
                }
            }
        }
        task.resume()
    }

    private func buildEndpoint(baseUrl: String, streamSessionId: String) -> URL? {
        let trimmedBase = baseUrl.hasSuffix("/")
            ? String(baseUrl.dropLast())
            : baseUrl
        return URL(string: "\(trimmedBase)/api/dictation/\(streamSessionId)/push")
    }

    private func logFailureOnce(key: String, message: String) {
        if loggedFailureKeys.contains(key) { return }
        loggedFailureKeys.insert(key)
        FileLog.shared.info(message)
    }
}

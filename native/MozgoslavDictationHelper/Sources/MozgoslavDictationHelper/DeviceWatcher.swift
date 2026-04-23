import Foundation

#if canImport(AVFoundation)
import AVFoundation
#endif

public final class DeviceWatcher {
    public struct Payload: Codable {
        public let kind: String
        public let devices: [DeviceInfo]
        public let observedAt: String
    }

    public struct DeviceInfo: Codable {
        public let id: String
        public let name: String
        public let isDefault: Bool
    }

    public var onChange: ((Payload) -> Void)?

    private let isoFormatter: ISO8601DateFormatter

    #if canImport(AVFoundation)
    private var observers: [NSObjectProtocol] = []
    #endif

    public init() {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        self.isoFormatter = iso
    }

    public func start() {
        #if canImport(AVFoundation) && os(macOS)
        let center = NotificationCenter.default
        observers.append(center.addObserver(
            forName: .AVCaptureDeviceWasConnected,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.emit(kind: "connected")
        })
        observers.append(center.addObserver(
            forName: .AVCaptureDeviceWasDisconnected,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.emit(kind: "disconnected")
        })
        emit(kind: "snapshot")
        #endif
    }

    public func stop() {
        #if canImport(AVFoundation)
        for observer in observers {
            NotificationCenter.default.removeObserver(observer)
        }
        observers.removeAll()
        #endif
    }

    #if canImport(AVFoundation) && os(macOS)
    private func emit(kind: String) {
        let deviceTypes: [AVCaptureDevice.DeviceType]
        if #available(macOS 14.0, *) {
            deviceTypes = [.microphone, .externalUnknown]
        } else {
            deviceTypes = [.builtInMicrophone, .externalUnknown]
        }
        let session = AVCaptureDevice.DiscoverySession(
            deviceTypes: deviceTypes,
            mediaType: .audio,
            position: .unspecified
        )
        let defaultDeviceId = AVCaptureDevice.default(for: .audio)?.uniqueID
        let devices = session.devices.map { d -> DeviceInfo in
            DeviceInfo(
                id: d.uniqueID,
                name: d.localizedName,
                isDefault: d.uniqueID == defaultDeviceId
            )
        }
        let payload = Payload(
            kind: kind,
            devices: devices,
            observedAt: isoFormatter.string(from: Date())
        )
        FileLog.shared.info(
            "D3 device change kind=\(kind) count=\(devices.count)"
        )
        onChange?(payload)
    }
    #endif
}

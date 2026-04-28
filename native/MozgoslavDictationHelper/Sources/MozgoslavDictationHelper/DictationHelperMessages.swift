import Foundation
import SwiftProtobuf

public struct Mozgoslav_Native_V1_StartCaptureRequest: Sendable, Hashable {
    public var deviceId: String = ""
    public var sampleRate: Int32 = 0
    public init() {}
}

public struct Mozgoslav_Native_V1_CaptureStarted: Sendable, Hashable {
    public var started: Bool = false
    public init() {}
}

public struct Mozgoslav_Native_V1_StopCaptureRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_CaptureStopped: Sendable, Hashable {
    public var stopped: Bool = false
    public init() {}
}

public struct Mozgoslav_Native_V1_StartFileCaptureRequest: Sendable, Hashable {
    public var sessionID: String = ""
    public var outputPath: String = ""
    public var sampleRate: Int32 = 0
    public var streamSessionID: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_PcmChunk: Sendable, Hashable {
    public var samplesFloat32Le: Data = Data()
    public var sampleRate: Int32 = 0
    public var offsetMs: Int64 = 0
    public init() {}
}

public struct Mozgoslav_Native_V1_StopFileCaptureRequest: Sendable, Hashable {
    public var sessionID: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_FileCaptureStopped: Sendable, Hashable {
    public var success: Bool = false
    public var path: String = ""
    public var durationMs: Int64 = 0
    public init() {}
}

public struct Mozgoslav_Native_V1_PermissionCheckRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_PermissionStatus: Sendable, Hashable {
    public var microphone: String = ""
    public var accessibility: String = ""
    public var inputMonitoring: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_PermissionRequestRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_PermissionGranted: Sendable, Hashable {
    public var accessibility: Bool = false
    public var inputMonitoring: Bool = false
    public var openedAccessibilitySettings: Bool = false
    public var openedInputMonitoringSettings: Bool = false
    public init() {}
}

public struct Mozgoslav_Native_V1_InjectTextRequest: Sendable, Hashable {
    public var text: String = ""
    public var mode: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_InjectResult: Sendable, Hashable {
    public var injected: Int32 = 0
    public var strategy: String = ""
    public var bundleID: String = ""
    public var appName: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_DetectTargetRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_InjectTarget: Sendable, Hashable {
    public var bundleID: String = ""
    public var appName: String = ""
    public var useAx: Bool = false
    public init() {}
}

public struct Mozgoslav_Native_V1_StartHotkeyRequest: Sendable, Hashable {
    public var accelerator: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_HotkeyEvent: Sendable, Hashable {
    public var kind: String = ""
    public var accelerator: String = ""
    public var observedAt: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_StopHotkeyRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_StartDumpHotkeyRequest: Sendable, Hashable {
    public var accelerator: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_StopDumpHotkeyRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_StartAskCorpusHotkeyRequest: Sendable, Hashable {
    public var accelerator: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_StopAskCorpusHotkeyRequest: Sendable, Hashable {
    public init() {}
}

public struct Mozgoslav_Native_V1_RunShortcutRequest: Sendable, Hashable {
    public var name: String = ""
    public var input: String = ""
    public init() {}
}

public struct Mozgoslav_Native_V1_RunShortcutResult: Sendable, Hashable {
    public var success: Bool = false
    public var stdout: String = ""
    public var stderr: String = ""
    public init() {}
}

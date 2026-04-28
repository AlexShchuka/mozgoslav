import Foundation
import SwiftProtobuf

fileprivate let _protobuf_package = "mozgoslav.native.v1"

public struct Mozgoslav_Native_V1_StartCaptureRequest: Sendable {
    public var deviceId: String = String()
    public var sampleRate: Int32 = 0
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StartCaptureRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StartCaptureRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.deviceId)
            case 2: try decoder.decodeSingularInt32Field(value: &self.sampleRate)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.deviceId.isEmpty {
            try visitor.visitSingularStringField(value: self.deviceId, fieldNumber: 1)
        }
        if self.sampleRate != 0 {
            try visitor.visitSingularInt32Field(value: self.sampleRate, fieldNumber: 2)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StartCaptureRequest, rhs: Mozgoslav_Native_V1_StartCaptureRequest) -> Bool {
        if lhs.deviceId != rhs.deviceId { return false }
        if lhs.sampleRate != rhs.sampleRate { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_CaptureStarted: Sendable {
    public var started: Bool = false
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_CaptureStarted: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".CaptureStarted"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularBoolField(value: &self.started)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if self.started != false {
            try visitor.visitSingularBoolField(value: self.started, fieldNumber: 1)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_CaptureStarted, rhs: Mozgoslav_Native_V1_CaptureStarted) -> Bool {
        if lhs.started != rhs.started { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StopCaptureRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StopCaptureRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StopCaptureRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StopCaptureRequest, rhs: Mozgoslav_Native_V1_StopCaptureRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_CaptureStopped: Sendable {
    public var stopped: Bool = false
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_CaptureStopped: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".CaptureStopped"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularBoolField(value: &self.stopped)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if self.stopped != false {
            try visitor.visitSingularBoolField(value: self.stopped, fieldNumber: 1)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_CaptureStopped, rhs: Mozgoslav_Native_V1_CaptureStopped) -> Bool {
        if lhs.stopped != rhs.stopped { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StartFileCaptureRequest: Sendable {
    public var sessionID: String = String()
    public var outputPath: String = String()
    public var sampleRate: Int32 = 0
    public var streamSessionID: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StartFileCaptureRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StartFileCaptureRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.sessionID)
            case 2: try decoder.decodeSingularStringField(value: &self.outputPath)
            case 3: try decoder.decodeSingularInt32Field(value: &self.sampleRate)
            case 4: try decoder.decodeSingularStringField(value: &self.streamSessionID)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.sessionID.isEmpty {
            try visitor.visitSingularStringField(value: self.sessionID, fieldNumber: 1)
        }
        if !self.outputPath.isEmpty {
            try visitor.visitSingularStringField(value: self.outputPath, fieldNumber: 2)
        }
        if self.sampleRate != 0 {
            try visitor.visitSingularInt32Field(value: self.sampleRate, fieldNumber: 3)
        }
        if !self.streamSessionID.isEmpty {
            try visitor.visitSingularStringField(value: self.streamSessionID, fieldNumber: 4)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StartFileCaptureRequest, rhs: Mozgoslav_Native_V1_StartFileCaptureRequest) -> Bool {
        if lhs.sessionID != rhs.sessionID { return false }
        if lhs.outputPath != rhs.outputPath { return false }
        if lhs.sampleRate != rhs.sampleRate { return false }
        if lhs.streamSessionID != rhs.streamSessionID { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_PcmChunk: Sendable {
    public var samplesFloat32Le: Data = Data()
    public var sampleRate: Int32 = 0
    public var offsetMs: Int64 = 0
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_PcmChunk: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".PcmChunk"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularBytesField(value: &self.samplesFloat32Le)
            case 2: try decoder.decodeSingularInt32Field(value: &self.sampleRate)
            case 3: try decoder.decodeSingularInt64Field(value: &self.offsetMs)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.samplesFloat32Le.isEmpty {
            try visitor.visitSingularBytesField(value: self.samplesFloat32Le, fieldNumber: 1)
        }
        if self.sampleRate != 0 {
            try visitor.visitSingularInt32Field(value: self.sampleRate, fieldNumber: 2)
        }
        if self.offsetMs != 0 {
            try visitor.visitSingularInt64Field(value: self.offsetMs, fieldNumber: 3)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_PcmChunk, rhs: Mozgoslav_Native_V1_PcmChunk) -> Bool {
        if lhs.samplesFloat32Le != rhs.samplesFloat32Le { return false }
        if lhs.sampleRate != rhs.sampleRate { return false }
        if lhs.offsetMs != rhs.offsetMs { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StopFileCaptureRequest: Sendable {
    public var sessionID: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StopFileCaptureRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StopFileCaptureRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.sessionID)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.sessionID.isEmpty {
            try visitor.visitSingularStringField(value: self.sessionID, fieldNumber: 1)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StopFileCaptureRequest, rhs: Mozgoslav_Native_V1_StopFileCaptureRequest) -> Bool {
        if lhs.sessionID != rhs.sessionID { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_FileCaptureStopped: Sendable {
    public var success: Bool = false
    public var path: String = String()
    public var durationMs: Int64 = 0
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_FileCaptureStopped: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".FileCaptureStopped"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularBoolField(value: &self.success)
            case 2: try decoder.decodeSingularStringField(value: &self.path)
            case 3: try decoder.decodeSingularInt64Field(value: &self.durationMs)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if self.success != false {
            try visitor.visitSingularBoolField(value: self.success, fieldNumber: 1)
        }
        if !self.path.isEmpty {
            try visitor.visitSingularStringField(value: self.path, fieldNumber: 2)
        }
        if self.durationMs != 0 {
            try visitor.visitSingularInt64Field(value: self.durationMs, fieldNumber: 3)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_FileCaptureStopped, rhs: Mozgoslav_Native_V1_FileCaptureStopped) -> Bool {
        if lhs.success != rhs.success { return false }
        if lhs.path != rhs.path { return false }
        if lhs.durationMs != rhs.durationMs { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_PermissionCheckRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_PermissionCheckRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".PermissionCheckRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_PermissionCheckRequest, rhs: Mozgoslav_Native_V1_PermissionCheckRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_PermissionStatus: Sendable {
    public var microphone: String = String()
    public var accessibility: String = String()
    public var inputMonitoring: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_PermissionStatus: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".PermissionStatus"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.microphone)
            case 2: try decoder.decodeSingularStringField(value: &self.accessibility)
            case 3: try decoder.decodeSingularStringField(value: &self.inputMonitoring)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.microphone.isEmpty {
            try visitor.visitSingularStringField(value: self.microphone, fieldNumber: 1)
        }
        if !self.accessibility.isEmpty {
            try visitor.visitSingularStringField(value: self.accessibility, fieldNumber: 2)
        }
        if !self.inputMonitoring.isEmpty {
            try visitor.visitSingularStringField(value: self.inputMonitoring, fieldNumber: 3)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_PermissionStatus, rhs: Mozgoslav_Native_V1_PermissionStatus) -> Bool {
        if lhs.microphone != rhs.microphone { return false }
        if lhs.accessibility != rhs.accessibility { return false }
        if lhs.inputMonitoring != rhs.inputMonitoring { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_PermissionRequestRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_PermissionRequestRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".PermissionRequestRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_PermissionRequestRequest, rhs: Mozgoslav_Native_V1_PermissionRequestRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_PermissionGranted: Sendable {
    public var accessibility: Bool = false
    public var inputMonitoring: Bool = false
    public var openedAccessibilitySettings: Bool = false
    public var openedInputMonitoringSettings: Bool = false
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_PermissionGranted: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".PermissionGranted"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularBoolField(value: &self.accessibility)
            case 2: try decoder.decodeSingularBoolField(value: &self.inputMonitoring)
            case 3: try decoder.decodeSingularBoolField(value: &self.openedAccessibilitySettings)
            case 4: try decoder.decodeSingularBoolField(value: &self.openedInputMonitoringSettings)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if self.accessibility != false {
            try visitor.visitSingularBoolField(value: self.accessibility, fieldNumber: 1)
        }
        if self.inputMonitoring != false {
            try visitor.visitSingularBoolField(value: self.inputMonitoring, fieldNumber: 2)
        }
        if self.openedAccessibilitySettings != false {
            try visitor.visitSingularBoolField(value: self.openedAccessibilitySettings, fieldNumber: 3)
        }
        if self.openedInputMonitoringSettings != false {
            try visitor.visitSingularBoolField(value: self.openedInputMonitoringSettings, fieldNumber: 4)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_PermissionGranted, rhs: Mozgoslav_Native_V1_PermissionGranted) -> Bool {
        if lhs.accessibility != rhs.accessibility { return false }
        if lhs.inputMonitoring != rhs.inputMonitoring { return false }
        if lhs.openedAccessibilitySettings != rhs.openedAccessibilitySettings { return false }
        if lhs.openedInputMonitoringSettings != rhs.openedInputMonitoringSettings { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_InjectTextRequest: Sendable {
    public var text: String = String()
    public var mode: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_InjectTextRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".InjectTextRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.text)
            case 2: try decoder.decodeSingularStringField(value: &self.mode)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.text.isEmpty {
            try visitor.visitSingularStringField(value: self.text, fieldNumber: 1)
        }
        if !self.mode.isEmpty {
            try visitor.visitSingularStringField(value: self.mode, fieldNumber: 2)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_InjectTextRequest, rhs: Mozgoslav_Native_V1_InjectTextRequest) -> Bool {
        if lhs.text != rhs.text { return false }
        if lhs.mode != rhs.mode { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_InjectResult: Sendable {
    public var injected: Int32 = 0
    public var strategy: String = String()
    public var bundleID: String = String()
    public var appName: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_InjectResult: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".InjectResult"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularInt32Field(value: &self.injected)
            case 2: try decoder.decodeSingularStringField(value: &self.strategy)
            case 3: try decoder.decodeSingularStringField(value: &self.bundleID)
            case 4: try decoder.decodeSingularStringField(value: &self.appName)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if self.injected != 0 {
            try visitor.visitSingularInt32Field(value: self.injected, fieldNumber: 1)
        }
        if !self.strategy.isEmpty {
            try visitor.visitSingularStringField(value: self.strategy, fieldNumber: 2)
        }
        if !self.bundleID.isEmpty {
            try visitor.visitSingularStringField(value: self.bundleID, fieldNumber: 3)
        }
        if !self.appName.isEmpty {
            try visitor.visitSingularStringField(value: self.appName, fieldNumber: 4)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_InjectResult, rhs: Mozgoslav_Native_V1_InjectResult) -> Bool {
        if lhs.injected != rhs.injected { return false }
        if lhs.strategy != rhs.strategy { return false }
        if lhs.bundleID != rhs.bundleID { return false }
        if lhs.appName != rhs.appName { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_DetectTargetRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_DetectTargetRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".DetectTargetRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_DetectTargetRequest, rhs: Mozgoslav_Native_V1_DetectTargetRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_InjectTarget: Sendable {
    public var bundleID: String = String()
    public var appName: String = String()
    public var useAx: Bool = false
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_InjectTarget: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".InjectTarget"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.bundleID)
            case 2: try decoder.decodeSingularStringField(value: &self.appName)
            case 3: try decoder.decodeSingularBoolField(value: &self.useAx)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.bundleID.isEmpty {
            try visitor.visitSingularStringField(value: self.bundleID, fieldNumber: 1)
        }
        if !self.appName.isEmpty {
            try visitor.visitSingularStringField(value: self.appName, fieldNumber: 2)
        }
        if self.useAx != false {
            try visitor.visitSingularBoolField(value: self.useAx, fieldNumber: 3)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_InjectTarget, rhs: Mozgoslav_Native_V1_InjectTarget) -> Bool {
        if lhs.bundleID != rhs.bundleID { return false }
        if lhs.appName != rhs.appName { return false }
        if lhs.useAx != rhs.useAx { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StartHotkeyRequest: Sendable {
    public var accelerator: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StartHotkeyRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StartHotkeyRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.accelerator)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.accelerator.isEmpty {
            try visitor.visitSingularStringField(value: self.accelerator, fieldNumber: 1)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StartHotkeyRequest, rhs: Mozgoslav_Native_V1_StartHotkeyRequest) -> Bool {
        if lhs.accelerator != rhs.accelerator { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_HotkeyEvent: Sendable {
    public var kind: String = String()
    public var accelerator: String = String()
    public var observedAt: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_HotkeyEvent: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".HotkeyEvent"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.kind)
            case 2: try decoder.decodeSingularStringField(value: &self.accelerator)
            case 3: try decoder.decodeSingularStringField(value: &self.observedAt)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.kind.isEmpty {
            try visitor.visitSingularStringField(value: self.kind, fieldNumber: 1)
        }
        if !self.accelerator.isEmpty {
            try visitor.visitSingularStringField(value: self.accelerator, fieldNumber: 2)
        }
        if !self.observedAt.isEmpty {
            try visitor.visitSingularStringField(value: self.observedAt, fieldNumber: 3)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_HotkeyEvent, rhs: Mozgoslav_Native_V1_HotkeyEvent) -> Bool {
        if lhs.kind != rhs.kind { return false }
        if lhs.accelerator != rhs.accelerator { return false }
        if lhs.observedAt != rhs.observedAt { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StopHotkeyRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StopHotkeyRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StopHotkeyRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StopHotkeyRequest, rhs: Mozgoslav_Native_V1_StopHotkeyRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StartDumpHotkeyRequest: Sendable {
    public var accelerator: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StartDumpHotkeyRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StartDumpHotkeyRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.accelerator)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.accelerator.isEmpty {
            try visitor.visitSingularStringField(value: self.accelerator, fieldNumber: 1)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StartDumpHotkeyRequest, rhs: Mozgoslav_Native_V1_StartDumpHotkeyRequest) -> Bool {
        if lhs.accelerator != rhs.accelerator { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StopDumpHotkeyRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StopDumpHotkeyRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StopDumpHotkeyRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StopDumpHotkeyRequest, rhs: Mozgoslav_Native_V1_StopDumpHotkeyRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StartAskCorpusHotkeyRequest: Sendable {
    public var accelerator: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StartAskCorpusHotkeyRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StartAskCorpusHotkeyRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.accelerator)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.accelerator.isEmpty {
            try visitor.visitSingularStringField(value: self.accelerator, fieldNumber: 1)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StartAskCorpusHotkeyRequest, rhs: Mozgoslav_Native_V1_StartAskCorpusHotkeyRequest) -> Bool {
        if lhs.accelerator != rhs.accelerator { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_StopAskCorpusHotkeyRequest: Sendable {
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_StopAskCorpusHotkeyRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".StopAskCorpusHotkeyRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let _ = try decoder.nextFieldNumber() {}
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_StopAskCorpusHotkeyRequest, rhs: Mozgoslav_Native_V1_StopAskCorpusHotkeyRequest) -> Bool {
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_RunShortcutRequest: Sendable {
    public var name: String = String()
    public var input: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_RunShortcutRequest: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".RunShortcutRequest"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularStringField(value: &self.name)
            case 2: try decoder.decodeSingularStringField(value: &self.input)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if !self.name.isEmpty {
            try visitor.visitSingularStringField(value: self.name, fieldNumber: 1)
        }
        if !self.input.isEmpty {
            try visitor.visitSingularStringField(value: self.input, fieldNumber: 2)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_RunShortcutRequest, rhs: Mozgoslav_Native_V1_RunShortcutRequest) -> Bool {
        if lhs.name != rhs.name { return false }
        if lhs.input != rhs.input { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

public struct Mozgoslav_Native_V1_RunShortcutResult: Sendable {
    public var success: Bool = false
    public var stdout: String = String()
    public var stderr: String = String()
    public var unknownFields = SwiftProtobuf.UnknownStorage()
    public init() {}
}

extension Mozgoslav_Native_V1_RunShortcutResult: SwiftProtobuf.Message, SwiftProtobuf._MessageImplementationBase, SwiftProtobuf._ProtoNameProviding {
    public static let protoMessageName: String = _protobuf_package + ".RunShortcutResult"
    public static let _protobuf_nameMap = SwiftProtobuf._NameMap(bytecode: "\0")

    public mutating func decodeMessage<D: SwiftProtobuf.Decoder>(decoder: inout D) throws {
        while let fieldNumber = try decoder.nextFieldNumber() {
            switch fieldNumber {
            case 1: try decoder.decodeSingularBoolField(value: &self.success)
            case 2: try decoder.decodeSingularStringField(value: &self.stdout)
            case 3: try decoder.decodeSingularStringField(value: &self.stderr)
            default: break
            }
        }
    }

    public func traverse<V: SwiftProtobuf.Visitor>(visitor: inout V) throws {
        if self.success != false {
            try visitor.visitSingularBoolField(value: self.success, fieldNumber: 1)
        }
        if !self.stdout.isEmpty {
            try visitor.visitSingularStringField(value: self.stdout, fieldNumber: 2)
        }
        if !self.stderr.isEmpty {
            try visitor.visitSingularStringField(value: self.stderr, fieldNumber: 3)
        }
        try unknownFields.traverse(visitor: &visitor)
    }

    public static func == (lhs: Mozgoslav_Native_V1_RunShortcutResult, rhs: Mozgoslav_Native_V1_RunShortcutResult) -> Bool {
        if lhs.success != rhs.success { return false }
        if lhs.stdout != rhs.stdout { return false }
        if lhs.stderr != rhs.stderr { return false }
        if lhs.unknownFields != rhs.unknownFields { return false }
        return true
    }
}

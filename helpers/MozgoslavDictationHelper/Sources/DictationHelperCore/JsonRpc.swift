import Foundation

/// Minimal JSON-RPC envelope used between the Electron main process and the
/// Swift helper. One-line JSON per message on stdin/stdout — no length prefix,
/// no batching. Matches the style used by `vscode-jsonrpc` light mode.
public struct JsonRpcRequest: Codable, Equatable, Sendable {
    public let id: String
    public let method: String
    public let params: JsonValue?

    public init(id: String, method: String, params: JsonValue? = nil) {
        self.id = id
        self.method = method
        self.params = params
    }
}

public struct JsonRpcResponse: Codable, Equatable, Sendable {
    public let id: String
    public let result: JsonValue?
    public let error: JsonRpcError?

    public init(id: String, result: JsonValue? = nil, error: JsonRpcError? = nil) {
        self.id = id
        self.result = result
        self.error = error
    }
}

public struct JsonRpcError: Codable, Equatable, Sendable {
    public let code: Int
    public let message: String

    public init(code: Int, message: String) {
        self.code = code
        self.message = message
    }
}

/// Value type for `params` / `result` that preserves JSON shape without
/// forcing a typed schema on the core package. Good enough for the 4 RPC
/// methods the helper exposes.
public enum JsonValue: Codable, Equatable, Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([JsonValue])
    case object([String: JsonValue])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let b = try? container.decode(Bool.self) {
            self = .bool(b)
        } else if let i = try? container.decode(Int.self) {
            self = .int(i)
        } else if let d = try? container.decode(Double.self) {
            self = .double(d)
        } else if let s = try? container.decode(String.self) {
            self = .string(s)
        } else if let a = try? container.decode([JsonValue].self) {
            self = .array(a)
        } else if let o = try? container.decode([String: JsonValue].self) {
            self = .object(o)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported JSON value"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .int(let i): try container.encode(i)
        case .double(let d): try container.encode(d)
        case .bool(let b): try container.encode(b)
        case .array(let a): try container.encode(a)
        case .object(let o): try container.encode(o)
        case .null: try container.encodeNil()
        }
    }

    public func stringValue() -> String? {
        if case .string(let s) = self { return s }
        return nil
    }

    public func objectValue() -> [String: JsonValue]? {
        if case .object(let o) = self { return o }
        return nil
    }

    public func intValue() -> Int? {
        if case .int(let i) = self { return i }
        if case .double(let d) = self { return Int(d) }
        return nil
    }
}

public enum JsonRpcCodec {
    public static func encode(_ response: JsonRpcResponse) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(response)
        return String(data: data, encoding: .utf8) ?? ""
    }

    public static func decodeRequest(_ line: String) throws -> JsonRpcRequest {
        let decoder = JSONDecoder()
        let data = Data(line.utf8)
        return try decoder.decode(JsonRpcRequest.self, from: data)
    }
}

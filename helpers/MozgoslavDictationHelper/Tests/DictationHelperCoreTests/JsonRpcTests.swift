import XCTest
@testable import DictationHelperCore

final class JsonRpcTests: XCTestCase {
    func testDecodeRequest_withObjectParams() throws {
        let line = #"{"id":"1","method":"inject.text","params":{"text":"hello","mode":"auto"}}"#
        let request = try JsonRpcCodec.decodeRequest(line)
        XCTAssertEqual(request.id, "1")
        XCTAssertEqual(request.method, "inject.text")
        XCTAssertEqual(request.params?.objectValue()?["text"]?.stringValue(), "hello")
        XCTAssertEqual(request.params?.objectValue()?["mode"]?.stringValue(), "auto")
    }

    func testDecodeRequest_withoutParams() throws {
        let line = #"{"id":"42","method":"capture.stop"}"#
        let request = try JsonRpcCodec.decodeRequest(line)
        XCTAssertEqual(request.id, "42")
        XCTAssertEqual(request.method, "capture.stop")
        XCTAssertNil(request.params)
    }

    func testEncodeResponse_withError() throws {
        let response = JsonRpcResponse(
            id: "7",
            error: JsonRpcError(code: -32601, message: "Unknown method: foo")
        )
        let encoded = try JsonRpcCodec.encode(response)
        XCTAssertTrue(encoded.contains("\"code\":-32601"))
        XCTAssertTrue(encoded.contains("\"message\":\"Unknown method: foo\""))
    }

    func testEncodeResponse_withObjectResult() throws {
        let response = JsonRpcResponse(
            id: "3",
            result: .object(["injected": .int(5), "strategy": .string("cgEvent")])
        )
        let encoded = try JsonRpcCodec.encode(response)
        XCTAssertTrue(encoded.contains("\"injected\":5"))
        XCTAssertTrue(encoded.contains("\"strategy\":\"cgEvent\""))
    }

    func testRoundTrip_preservesShape() throws {
        let original = JsonRpcRequest(
            id: "rt",
            method: "inject.text",
            params: .object([
                "text": .string("привет"),
                "count": .int(6),
                "probability": .double(0.95),
                "flag": .bool(true),
                "list": .array([.int(1), .int(2)]),
            ])
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(original)
        let line = String(data: data, encoding: .utf8)!
        let decoded = try JsonRpcCodec.decodeRequest(line)

        XCTAssertEqual(decoded, original)
    }
}

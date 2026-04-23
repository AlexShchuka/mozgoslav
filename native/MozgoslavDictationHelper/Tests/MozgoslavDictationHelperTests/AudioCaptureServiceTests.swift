import XCTest

@testable import MozgoslavDictationHelper

final class AudioCaptureServiceTests: XCTestCase {
    func testInit_DoesNotCrash_OnHostWithoutAudioHardware() {
        _ = AudioCaptureService()
    }

    func testStopFileCapture_UnknownSessionId_ThrowsHelperError32021() {
        let sut = AudioCaptureService()

        XCTAssertThrowsError(try sut.stopFileCapture(sessionId: "nonexistent")) { error in
            guard let helperError = error as? HelperError else {
                XCTFail("Expected HelperError, got \(type(of: error))")
                return
            }
            XCTAssertEqual(helperError.code, -32021)
            XCTAssertTrue(
                helperError.message.contains("nonexistent"),
                "HelperError message should name the missing sessionId for diagnosis"
            )
        }
    }

    func testChunk_Initialization_PreservesAllFields() {
        let chunk = AudioCaptureService.Chunk(
            samples: [0.1, -0.2, 0.3],
            sampleRate: 16_000,
            offsetMs: 250
        )

        XCTAssertEqual(chunk.samples, [0.1, -0.2, 0.3])
        XCTAssertEqual(chunk.sampleRate, 16_000)
        XCTAssertEqual(chunk.offsetMs, 250)
    }
}

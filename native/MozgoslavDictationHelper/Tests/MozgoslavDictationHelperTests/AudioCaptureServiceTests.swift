import XCTest

@testable import MozgoslavDictationHelper

/// Unit-test coverage for `AudioCaptureService` is intentionally narrow: the
/// live-capture path is a thin wrapper around `AVAudioEngine` + `AVAudioSinkNode`
/// and needs real audio hardware (granted microphone + active input device)
/// to run, which CI runners do not reliably provide. What *is* safe to test
/// here are the pure state-machine guards and public data shapes that don't
/// touch Core Audio at all — if those regress silently the helper breaks the
/// JSON-RPC contract with the Electron main process.
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

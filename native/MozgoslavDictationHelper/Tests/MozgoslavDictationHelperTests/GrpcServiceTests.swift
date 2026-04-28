import XCTest
import DictationHelperCore

@testable import MozgoslavDictationHelper

final class GrpcServiceTests: XCTestCase {

    private func makeService() -> DictationHelperGrpcService {
        DictationHelperGrpcService(
            audioCapture: AudioCaptureService(),
            textInjector: TextInjectionService(),
            focusDetector: FocusedAppDetector(),
            hotkeyMonitor: HotkeyMonitor(),
            dumpHotkeyMonitor: HotkeyMonitor(),
            askCorpusHotkeyMonitor: HotkeyMonitor()
        )
    }

    func testRunShortcut_emptyName_returnsFailure() async {
        let service = makeService()
        var request = Mozgoslav_Native_V1_RunShortcutRequest()
        request.name = ""

        let result = await service.runShortcut(request)

        XCTAssertFalse(result.success)
        XCTAssertFalse(result.stderr.isEmpty, "Failure should include a reason")
    }

    func testRunShortcut_nonexistentShortcut_returnsFailure() async {
        let service = makeService()
        var request = Mozgoslav_Native_V1_RunShortcutRequest()
        request.name = "MozgoslavTestNonExistentShortcut_\(UUID().uuidString)"
        request.input = ""

        let result = await service.runShortcut(request)

        XCTAssertFalse(result.success)
    }

    func testCheckPermissions_returnsAllThreeFields() async {
        let service = makeService()
        let request = Mozgoslav_Native_V1_PermissionCheckRequest()

        let result = await service.checkPermissions(request)

        let valid = Set(["granted", "denied", "undetermined"])
        XCTAssertTrue(valid.contains(result.microphone), "microphone: \(result.microphone)")
        XCTAssertTrue(valid.contains(result.accessibility), "accessibility: \(result.accessibility)")
        XCTAssertTrue(valid.contains(result.inputMonitoring), "inputMonitoring: \(result.inputMonitoring)")
    }

    func testDetectInjectTarget_returnsStructWithBoolUseAx() async {
        let service = makeService()
        let request = Mozgoslav_Native_V1_DetectTargetRequest()

        let result = await service.detectInjectTarget(request)

        _ = result.useAx
        _ = result.bundleID
        _ = result.appName
    }

    func testStopCapture_whenNotStarted_doesNotCrash() async throws {
        let service = makeService()
        let request = Mozgoslav_Native_V1_StopCaptureRequest()

        let result = try await service.stopCapture(request)

        XCTAssertTrue(result.stopped)
    }

    func testStopFileCapture_unknownSession_throwsHelperError() async {
        let service = makeService()
        var request = Mozgoslav_Native_V1_StopFileCaptureRequest()
        request.sessionID = "nonexistent-session-\(UUID().uuidString)"

        do {
            _ = try await service.stopFileCapture(request)
            XCTFail("Expected throw for unknown session")
        } catch let err as HelperError {
            XCTAssertEqual(err.code, -32021)
        } catch {
            XCTFail("Expected HelperError, got: \(error)")
        }
    }
}

import XCTest
@testable import DictationHelperCore

final class InjectionStrategyTests: XCTestCase {
    func testAutoModeForNativeAppReturnsCgEvent() {
        let strategy = InjectionStrategySelector.strategy(forBundleId: "com.apple.TextEdit")
        XCTAssertEqual(strategy, .cgEvent)
    }

    func testAutoModeForVSCodeReturnsAccessibility() {
        let strategy = InjectionStrategySelector.strategy(forBundleId: "com.microsoft.VSCode")
        XCTAssertEqual(strategy, .accessibility)
    }

    func testAutoModeForSlackReturnsAccessibility() {
        let strategy = InjectionStrategySelector.strategy(forBundleId: "com.tinyspeck.slackmacgap")
        XCTAssertEqual(strategy, .accessibility)
    }

    func testAutoModeForObsidianReturnsAccessibility() {
        let strategy = InjectionStrategySelector.strategy(forBundleId: "md.obsidian")
        XCTAssertEqual(strategy, .accessibility)
    }

    func testExplicitCgEventModeOverridesBlocklist() {
        let strategy = InjectionStrategySelector.strategy(
            forBundleId: "com.microsoft.VSCode",
            mode: "cgevent"
        )
        XCTAssertEqual(strategy, .cgEvent)
    }

    func testExplicitAccessibilityModeOverridesNativeApp() {
        let strategy = InjectionStrategySelector.strategy(
            forBundleId: "com.apple.TextEdit",
            mode: "accessibility"
        )
        XCTAssertEqual(strategy, .accessibility)
    }

    func testMissingBundleIdDefaultsToCgEvent() {
        XCTAssertEqual(InjectionStrategySelector.strategy(forBundleId: nil), .cgEvent)
        XCTAssertEqual(InjectionStrategySelector.strategy(forBundleId: ""), .cgEvent)
    }

    func testElectronBlocklistIsNotEmpty() {
        XCTAssertGreaterThan(InjectionStrategySelector.electronBundleIds.count, 5)
    }

    func testExplicitClipboardModeOverridesAutoSelection() {
        let strategy = InjectionStrategySelector.strategy(
            forBundleId: "com.apple.TextEdit",
            mode: "clipboard"
        )
        XCTAssertEqual(strategy, .clipboard)
    }

    func testUnknownModeFallsBackToAutoSelection() {
        let strategy = InjectionStrategySelector.strategy(
            forBundleId: "md.obsidian",
            mode: "totally-unknown-mode"
        )
        XCTAssertEqual(strategy, .accessibility)
    }

    func testClipboardStrategyRoundTripsThroughCodable() throws {
        let encoded = try JSONEncoder().encode(InjectionStrategy.clipboard)
        let decoded = try JSONDecoder().decode(InjectionStrategy.self, from: encoded)
        XCTAssertEqual(decoded, .clipboard)
    }


    final class SpyAx: AxInjector {
        var throwTimeoutCount = 0
        var calls: [(String, TimeInterval)] = []
        func inject(_ text: String, timeout: TimeInterval) throws {
            calls.append((text, timeout))
            if throwTimeoutCount > 0 {
                throwTimeoutCount -= 1
                throw InjectionError.axTimeout
            }
        }
    }

    final class SpyCg: CgEventInjector {
        var pasteCalls = 0
        func paste() throws { pasteCalls += 1 }
    }

    final class SpyPasteboard: DictationHelperCore.Pasteboard {
        var value: String? = "prior content"
        var writes: [String] = []
        func readString() -> String? { value }
        func setString(_ value: String) {
            writes.append(value)
            self.value = value
        }
    }

    func testAxTimeout_FallsBackToCgEvent() throws {
        let ax = SpyAx()
        let cg = SpyCg()
        let pb = SpyPasteboard()
        ax.throwTimeoutCount = 1

        let strategy = InjectionStrategyRunner(ax: ax, cg: cg, pasteboard: pb)

        try strategy.inject(text: "hello", mode: .auto)

        XCTAssertEqual(ax.calls.count, 1)
        XCTAssertEqual(cg.pasteCalls, 1)
        XCTAssertEqual(pb.value, "prior content")
        XCTAssertEqual(pb.writes, ["hello", "prior content"])
    }

    func testAxSuccess_ClipboardNotTouched() throws {
        let ax = SpyAx()
        let cg = SpyCg()
        let pb = SpyPasteboard()

        let strategy = InjectionStrategyRunner(ax: ax, cg: cg, pasteboard: pb)

        try strategy.inject(text: "hello", mode: .auto)

        XCTAssertEqual(ax.calls.count, 1)
        XCTAssertEqual(cg.pasteCalls, 0)
        XCTAssertEqual(pb.writes, [])
        XCTAssertEqual(pb.value, "prior content")
    }

    func testClipboardMode_ExplicitlyPastes() throws {
        let ax = SpyAx()
        let cg = SpyCg()
        let pb = SpyPasteboard()

        let strategy = InjectionStrategyRunner(ax: ax, cg: cg, pasteboard: pb)

        try strategy.inject(text: "explicit", mode: .clipboard)

        XCTAssertEqual(ax.calls.count, 0)
        XCTAssertEqual(cg.pasteCalls, 1)
        XCTAssertEqual(pb.writes, ["explicit", "prior content"])
    }

    func testClipboardFailure_Surfaces() {
        struct PasteFailed: Error {}
        final class FailingCg: CgEventInjector {
            func paste() throws { throw PasteFailed() }
        }

        let ax = SpyAx()
        let cg = FailingCg()
        let pb = SpyPasteboard()
        ax.throwTimeoutCount = 1

        let strategy = InjectionStrategyRunner(ax: ax, cg: cg, pasteboard: pb)

        XCTAssertThrowsError(try strategy.inject(text: "hello", mode: .auto)) { err in
            guard case InjectionError.clipboardFailed = err else {
                XCTFail("expected clipboardFailed, got \(err)")
                return
            }
        }

        XCTAssertEqual(pb.value, "prior content")
    }
}

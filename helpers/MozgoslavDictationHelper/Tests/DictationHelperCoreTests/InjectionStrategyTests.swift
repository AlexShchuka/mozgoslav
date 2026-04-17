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
        // Defensive contract — JSON-RPC callers may send a typo or a future
        // mode the helper version does not know about yet. Falling back to
        // the app-aware auto path is safer than erroring out.
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

    // MARK: - BC-007 fallback runner (ADR-007 Phase 2 §3.2)
    //
    // The four tests below follow the ADR-007-phase2-swift.md §3.2 contract
    // verbatim. The struct under test is named `InjectionStrategyRunner`
    // instead of the ADR's `InjectionStrategy` because the latter name is
    // already taken by the enum above (used by `TextInjectionService` and
    // `DictationHelper`, which are outside this agent's write scope).

    // Spies
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

    final class SpyPasteboard: Pasteboard {
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
        // Prior pasteboard content must be restored.
        XCTAssertEqual(pb.value, "prior content")
        // "hello" was set, then restored.
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

        // Even on failure the prior pasteboard content must be restored.
        XCTAssertEqual(pb.value, "prior content")
    }
}

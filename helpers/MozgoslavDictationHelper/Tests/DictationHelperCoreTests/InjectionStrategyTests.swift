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
}

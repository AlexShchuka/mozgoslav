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
}

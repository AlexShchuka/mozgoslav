import Foundation

#if canImport(AppKit)
import AppKit
#endif

/// Small lookup for "what app currently has keyboard focus?" — returns both
/// bundle id (for strategy selection) and user-visible name (for logging).
/// On non-macOS hosts returns nil values so that the helper still links for
/// Swift Package test targets.
public final class FocusedAppDetector {
    public struct Result {
        public let bundleId: String?
        public let appName: String?
    }

    public init() {}

    public func detect() -> Result {
        #if canImport(AppKit)
        let app = NSWorkspace.shared.frontmostApplication
        return Result(bundleId: app?.bundleIdentifier, appName: app?.localizedName)
        #else
        return Result(bundleId: nil, appName: nil)
        #endif
    }
}

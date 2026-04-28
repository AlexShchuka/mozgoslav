import Foundation

#if canImport(AppKit)
import AppKit
#endif

public final class FocusedAppDetector: @unchecked Sendable {
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

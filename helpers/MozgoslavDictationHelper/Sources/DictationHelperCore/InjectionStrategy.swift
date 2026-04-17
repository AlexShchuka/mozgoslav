import Foundation

/// Which native API to use when injecting text into the focused app.
public enum InjectionStrategy: String, Codable, Sendable {
    /// Fast path — `CGEventPost(kCGHIDEventTap, …)` with synthesized
    /// keyboard events. ~1-5 ms per character on native macOS apps.
    case cgEvent

    /// Compatibility path — `AXUIElement` + `AXSetValue(kAXValueAttribute, …)`
    /// directly into the focused element. Required for Electron-based apps
    /// which swallow raw HID events. ~10-30 ms per character but always works.
    case accessibility

    /// Last-resort path — copy the text to the system pasteboard and
    /// synthesize a ⌘V keystroke. Not every app handles this cleanly (e.g.,
    /// password fields reject it) but it is the only path that works when
    /// AX requests hang. ADR-004 R3.
    case clipboard
}

/// Selects the right injection API for a given focused app.
///
/// Electron-based apps ship their own input stack that filters synthesized
/// `CGEventPost` events; for them the Accessibility API is the only reliable
/// path. Native apps (TextEdit, Mail, Safari, …) accept CGEvents directly and
/// we prefer them because they round-trip significantly faster.
public enum InjectionStrategySelector {
    /// Bundle identifiers of Electron-based apps that are known to require the
    /// Accessibility API fallback. Sorted; keep the list small and deliberate —
    /// adding a wrong entry only slows injection for that app by ~10 ms / char.
    public static let electronBundleIds: Set<String> = [
        "com.microsoft.VSCode",
        "com.microsoft.VSCodeInsiders",
        "com.visualstudio.code.oss",
        "com.todesktop.230313mzl4w4u92",  // Cursor
        "com.hnc.Discord",
        "com.tinyspeck.slackmacgap",
        "notion.id",
        "md.obsidian",
        "company.thebrowser.Browser",  // Arc
        "com.electron.quasar",
        "com.github.atom",
        "com.postmanlabs.mac",
        "com.figma.Desktop",
        "com.linear",
        "com.spotify.client",
        "com.whatsapp.WhatsApp",
        "com.microsoft.teams2",
        "com.microsoft.teams",
        "com.readdle.SparkDesktop",
    ]

    public static func strategy(forBundleId bundleId: String?, mode: String = "auto") -> InjectionStrategy {
        switch mode {
        case "cgevent":
            return .cgEvent
        case "accessibility":
            return .accessibility
        case "clipboard":
            return .clipboard
        default:
            guard let id = bundleId, !id.isEmpty else { return .cgEvent }
            return electronBundleIds.contains(id) ? .accessibility : .cgEvent
        }
    }
}

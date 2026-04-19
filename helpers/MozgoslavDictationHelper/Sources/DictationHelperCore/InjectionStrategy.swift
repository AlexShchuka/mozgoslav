import Foundation
#if canImport(AppKit)
import AppKit
#endif

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


/// How the runner decides which backend to use for a single injection call.
public enum InjectionMode: String, Sendable {
    /// Force the Accessibility API path.
    case ax
    /// Force the pasteboard paste path.
    case clipboard
    /// Try AX first, fall back to the clipboard path on timeout / denial.
    case auto
}

/// Errors surfaced by `InjectionStrategyRunner.inject(text:mode:)`.
public enum InjectionError: Error, Sendable {
    /// AX call did not return within the configured `axTimeout` budget.
    case axTimeout
    /// AX call returned but the target refused the write (e.g. locked app).
    case axDenied
    /// Clipboard paste backend failed; the prior pasteboard contents were
    /// still restored before this error was surfaced.
    case clipboardFailed(reason: String)
    /// Both AX and clipboard failed; each `reason` is a human-readable string.
    case bothFailed(axReason: String, clipboardReason: String)
}

/// Abstraction over the system pasteboard so tests can inject a spy.
public protocol Pasteboard {
    /// Read the current string contents, or `nil` if the pasteboard is empty /
    /// contains a non-string type.
    func readString() -> String?
    /// Replace the pasteboard contents with `value`.
    func setString(_ value: String)
}

/// Abstraction over the Accessibility-API text injector.
public protocol AxInjector {
    /// Attempts AX-based text injection. Must throw `InjectionError.axTimeout`
    /// on timeout, or `InjectionError.axDenied` when the target rejects the
    /// write.
    func inject(_ text: String, timeout: TimeInterval) throws
}

/// Abstraction over the CGEvent paste backend.
public protocol CgEventInjector {
    /// Performs a `Cmd+V` key-down / key-up sequence via CGEventPost.
    func paste() throws
}

/// Runs a single text injection per BC-007: tries AX first (with a wall-clock
/// timeout), falls back to a clipboard paste on timeout / denial, and
/// restores the prior pasteboard contents afterwards regardless of outcome.
///
/// Collaborators are injected as protocols so the runner is fully unit-testable
/// without any macOS system API access. In production the Swift executable
/// wires `SystemAxInjector` / `SystemCgEventInjector` / `NSPasteboard.general`
/// adapters; those implementations live outside this core library.
public struct InjectionStrategyRunner {
    private let ax: AxInjector
    private let cg: CgEventInjector
    private let pasteboard: Pasteboard
    private let axTimeout: TimeInterval

    /// - Parameters:
    ///   - axTimeout: wall-clock budget for a single AX call. `0.6` matches
    ///     ADR-004 R3 guidance; keep below ~500 ms user-perceivable freeze.
    public init(
        ax: AxInjector,
        cg: CgEventInjector,
        pasteboard: Pasteboard,
        axTimeout: TimeInterval = 0.6
    ) {
        self.ax = ax
        self.cg = cg
        self.pasteboard = pasteboard
        self.axTimeout = axTimeout
    }

    public func inject(text: String, mode: InjectionMode) throws {
        switch mode {
        case .ax:
            try ax.inject(text, timeout: axTimeout)
        case .clipboard:
            try pasteViaClipboard(text)
        case .auto:
            do {
                try ax.inject(text, timeout: axTimeout)
            } catch InjectionError.axTimeout {
                try pasteViaClipboard(text)
            } catch InjectionError.axDenied {
                try pasteViaClipboard(text)
            }
        }
    }

    private func pasteViaClipboard(_ text: String) throws {
        let prior = pasteboard.readString()
        pasteboard.setString(text)
        defer {
            if let prior = prior {
                pasteboard.setString(prior)
            }
        }
        do {
            try cg.paste()
        } catch {
            throw InjectionError.clipboardFailed(reason: "\(error)")
        }
    }
}

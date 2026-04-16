import Foundation
import DictationHelperCore

#if canImport(ApplicationServices)
import ApplicationServices
#endif

#if canImport(AppKit)
import AppKit
#endif

/// Writes a string into whatever app currently owns the keyboard focus.
///
/// Two backends:
///  - `CGEventPost(kCGHIDEventTap, …)` synthesizes Unicode keyboard events.
///    Fast (~1-5 ms / char), works in any native-Cocoa app.
///  - `AXUIElement + AXSetValue(kAXValueAttribute, …)` writes the string
///    directly into the focused element. Slower (~10-30 ms / char) but the
///    only reliable path for Electron apps that swallow raw HID events.
///
/// Selection is made by `InjectionStrategySelector` based on the focused app's
/// bundle id, so this class stays a narrow executor.
public final class TextInjectionService {
    public init() {}

    public func inject(text: String, strategy: InjectionStrategy) throws {
        guard !text.isEmpty else { return }

        switch strategy {
        case .cgEvent:
            try injectViaCgEvent(text)
        case .accessibility:
            try injectViaAccessibility(text)
        }
    }

    private func injectViaCgEvent(_ text: String) throws {
        #if canImport(ApplicationServices)
        guard let source = CGEventSource(stateID: .combinedSessionState) else {
            throw HelperError(code: -32030, message: "Failed to create CGEventSource")
        }

        for scalar in text.unicodeScalars {
            guard let keyDown = CGEvent(
                keyboardEventSource: source,
                virtualKey: 0,
                keyDown: true
            ), let keyUp = CGEvent(
                keyboardEventSource: source,
                virtualKey: 0,
                keyDown: false
            ) else {
                throw HelperError(code: -32031, message: "Failed to create CGEvent")
            }

            var utf16 = Array(String(scalar).utf16)
            keyDown.keyboardSetUnicodeString(stringLength: utf16.count, unicodeString: &utf16)
            keyUp.keyboardSetUnicodeString(stringLength: utf16.count, unicodeString: &utf16)

            keyDown.post(tap: .cgHIDEventTap)
            keyUp.post(tap: .cgHIDEventTap)
        }
        #else
        _ = text
        throw HelperError(code: -32020, message: "CGEvent injection is only available on macOS")
        #endif
    }

    private func injectViaAccessibility(_ text: String) throws {
        #if canImport(ApplicationServices)
        let systemElement = AXUIElementCreateSystemWide()
        var focusedValue: AnyObject?
        let focusStatus = AXUIElementCopyAttributeValue(
            systemElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedValue
        )
        guard focusStatus == .success, let focused = focusedValue else {
            // Fall back to CGEvent rather than failing outright — better UX.
            try injectViaCgEvent(text)
            return
        }

        let element = focused as! AXUIElement
        var existingValue: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &existingValue)
        let existing = (existingValue as? String) ?? ""
        let newValue = existing + text

        let setStatus = AXUIElementSetAttributeValue(element, kAXValueAttribute as CFString, newValue as CFString)
        if setStatus != .success {
            // Some Electron apps accept selection-based insertion better.
            try injectViaCgEvent(text)
        }
        #else
        _ = text
        throw HelperError(code: -32020, message: "AX injection is only available on macOS")
        #endif
    }
}

import Foundation
import DictationHelperCore

#if canImport(ApplicationServices)
import ApplicationServices
#endif

#if canImport(AppKit)
import AppKit
#endif

public final class TextInjectionService {
    public static let accessibilityTimeoutSeconds: Double = 0.5

    public init() {}

    public func inject(text: String, strategy: InjectionStrategy) throws {
        guard !text.isEmpty else {
            FileLog.shared.info("TextInjectionService: skip empty text")
            return
        }
        FileLog.shared.info("TextInjectionService: inject strategy=\(strategy) len=\(text.count)")
        do {
            switch strategy {
            case .cgEvent:
                try injectViaCgEvent(text)
            case .accessibility:
                try injectViaAccessibilityWithFallback(text)
            case .clipboard:
                try injectViaClipboard(text)
            }
            FileLog.shared.info("TextInjectionService: injected strategy=\(strategy) len=\(text.count)")
        } catch {
            FileLog.shared.warn("TextInjectionService: failed strategy=\(strategy) error=\(error)")
            throw error
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

            keyDown.post(tap: .cghidEventTap)
            keyUp.post(tap: .cghidEventTap)
        }
        #else
        _ = text
        throw HelperError(code: -32020, message: "CGEvent injection is only available on macOS")
        #endif
    }

    private func injectViaAccessibilityWithFallback(_ text: String) throws {
        #if canImport(ApplicationServices)
        let semaphore = DispatchSemaphore(value: 0)
        var result: AXInjectionResult = .timeout
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else {
                semaphore.signal()
                return
            }
            result = self.injectViaAccessibility(text)
            semaphore.signal()
        }

        let deadline = DispatchTime.now() + Self.accessibilityTimeoutSeconds
        if semaphore.wait(timeout: deadline) == .timedOut {
            try injectViaClipboard(text)
            return
        }

        switch result {
        case .success:
            return
        case .retryViaCgEvent:
            try injectViaCgEvent(text)
        case .retryViaClipboard:
            try injectViaClipboard(text)
        case .timeout:
            try injectViaClipboard(text)
        }
        #else
        _ = text
        throw HelperError(code: -32020, message: "AX injection is only available on macOS")
        #endif
    }

    #if canImport(ApplicationServices)
    private enum AXInjectionResult {
        case success
        case retryViaCgEvent
        case retryViaClipboard
        case timeout
    }

    private func injectViaAccessibility(_ text: String) -> AXInjectionResult {
        let systemElement = AXUIElementCreateSystemWide()
        var focusedValue: AnyObject?
        let focusStatus = AXUIElementCopyAttributeValue(
            systemElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedValue
        )
        guard focusStatus == .success, let focused = focusedValue else {
            return .retryViaCgEvent
        }

        let element = focused as! AXUIElement
        var existingValue: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &existingValue)
        let existing = (existingValue as? String) ?? ""
        let newValue = existing + text

        let setStatus = AXUIElementSetAttributeValue(
            element,
            kAXValueAttribute as CFString,
            newValue as CFString
        )
        if setStatus == .success {
            return .success
        }
        return .retryViaClipboard
    }
    #endif

    private func injectViaClipboard(_ text: String) throws {
        #if canImport(AppKit) && canImport(ApplicationServices)
        let pasteboard = NSPasteboard.general
        let saved = pasteboard.string(forType: .string)
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        try synthesizeCommandV()

        if let saved {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                pasteboard.clearContents()
                pasteboard.setString(saved, forType: .string)
            }
        }
        #else
        _ = text
        throw HelperError(code: -32020, message: "Clipboard injection is only available on macOS")
        #endif
    }

    #if canImport(AppKit) && canImport(ApplicationServices)
    private func synthesizeCommandV() throws {
        guard let source = CGEventSource(stateID: .combinedSessionState) else {
            throw HelperError(code: -32032, message: "Failed to create CGEventSource for paste")
        }

        let keyV: CGKeyCode = 0x09

        guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: keyV, keyDown: true),
              let keyUp = CGEvent(keyboardEventSource: source, virtualKey: keyV, keyDown: false) else {
            throw HelperError(code: -32033, message: "Failed to create paste CGEvent")
        }
        keyDown.flags = .maskCommand
        keyUp.flags = .maskCommand
        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
    }
    #endif
}

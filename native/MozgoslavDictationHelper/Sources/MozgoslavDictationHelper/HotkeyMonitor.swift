import Foundation

#if canImport(AppKit)
import AppKit
#endif

public final class HotkeyMonitor {
    public struct Payload: Codable {
        public let kind: String 
        public let accelerator: String
        public let observedAt: String
    }

    public var onEvent: ((Payload) -> Void)?

    private let isoFormatter: ISO8601DateFormatter
    private var parsed: ParsedAccelerator?
    private var holding: Bool = false

    #if canImport(AppKit) && os(macOS)
    private var keyDownMonitor: Any?
    private var keyUpMonitor: Any?
    private var flagsMonitor: Any?
    #endif

    public init() {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        self.isoFormatter = iso
    }

    public func start(accelerator: String) {
        stop()
        let trimmed = accelerator.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, let parsed = parse(accelerator: trimmed) else {
            FileLog.shared.info("H1 HotkeyMonitor: disabled (empty or unparseable accelerator)")
            return
        }
        self.parsed = parsed

        #if canImport(AppKit) && os(macOS)
        let accessibilityGranted = PermissionProbe.accessibilityStatus() == "granted"
        if !accessibilityGranted {
            FileLog.shared.warn(
                "H1 HotkeyMonitor: Accessibility NOT granted — NSEvent.addGlobalMonitorForEvents " +
                "will silently return nil; push-to-talk hotkey will NEVER fire. " +
                "Grant in System Settings → Privacy & Security → Accessibility (Electron.app or Mozgoslav.app)."
            )
        }

        keyDownMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleKey(event: event, kind: "press")
        }
        keyUpMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyUp) { [weak self] event in
            self?.handleKey(event: event, kind: "release")
        }
        flagsMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            _ = event
            _ = self
        }
        if keyDownMonitor == nil || keyUpMonitor == nil {
            FileLog.shared.warn(
                "H1 HotkeyMonitor: NSEvent.addGlobalMonitorForEvents returned nil " +
                "(keyDown=\(keyDownMonitor != nil ? "ok" : "NIL") keyUp=\(keyUpMonitor != nil ? "ok" : "NIL")) — " +
                "hotkey will not fire. Check Accessibility grant."
            )
        }
        FileLog.shared.info(
            "H1 HotkeyMonitor started for accelerator='\(trimmed)' accessibilityGranted=\(accessibilityGranted) " +
            "keyDownMonitor=\(keyDownMonitor != nil) keyUpMonitor=\(keyUpMonitor != nil)"
        )
        #else
        _ = parsed
        _ = holding
        #endif
    }

    public func stop() {
        #if canImport(AppKit) && os(macOS)
        if let keyDownMonitor {
            NSEvent.removeMonitor(keyDownMonitor)
            self.keyDownMonitor = nil
        }
        if let keyUpMonitor {
            NSEvent.removeMonitor(keyUpMonitor)
            self.keyUpMonitor = nil
        }
        if let flagsMonitor {
            NSEvent.removeMonitor(flagsMonitor)
            self.flagsMonitor = nil
        }
        #endif
        parsed = nil
        holding = false
    }

    #if canImport(AppKit) && os(macOS)
    private func handleKey(event: NSEvent, kind: String) {
        guard let parsed else { return }
        guard matches(event: event, against: parsed) else { return }

        if kind == "press" {
            if holding { return }
            holding = true
        } else if kind == "release" {
            if !holding { return }
            holding = false
        }

        FileLog.shared.info("H1 HotkeyMonitor: \(kind) accelerator='\(parsed.accelerator)'")
        let payload = Payload(
            kind: kind,
            accelerator: parsed.accelerator,
            observedAt: isoFormatter.string(from: Date())
        )
        onEvent?(payload)
    }

    private func matches(event: NSEvent, against parsed: ParsedAccelerator) -> Bool {
        let modifiers = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        let hasCommand = modifiers.contains(.command) || modifiers.contains(.control)
        let hasShift = modifiers.contains(.shift)
        let hasAlt = modifiers.contains(.option)

        if parsed.requiresCommandOrControl != hasCommand { return false }
        if parsed.requiresShift != hasShift { return false }
        if parsed.requiresAlt != hasAlt { return false }

        let keyChar = event.charactersIgnoringModifiers?.uppercased() ?? ""
        return keyChar == parsed.keyName
    }
    #endif


    private struct ParsedAccelerator {
        let accelerator: String
        let requiresCommandOrControl: Bool
        let requiresShift: Bool
        let requiresAlt: Bool
        let keyName: String
    }

    private func parse(accelerator: String) -> ParsedAccelerator? {
        let tokens = accelerator.split(separator: "+").map { $0.trimmingCharacters(in: .whitespaces) }
        guard let last = tokens.last else { return nil }
        let mods = tokens.dropLast()
        let requiresCommand = mods.contains("CommandOrControl") || mods.contains("Command")
            || mods.contains("Control") || mods.contains("Cmd") || mods.contains("Ctrl")
        let requiresShift = mods.contains("Shift")
        let requiresAlt = mods.contains("Alt") || mods.contains("Option")

        let keyName = mapKey(last)
        return ParsedAccelerator(
            accelerator: accelerator,
            requiresCommandOrControl: requiresCommand,
            requiresShift: requiresShift,
            requiresAlt: requiresAlt,
            keyName: keyName.uppercased()
        )
    }

    private func mapKey(_ token: String) -> String {
        switch token {
        case "Space": return " "
        case "Return", "Enter": return "\u{000D}"
        case "Esc", "Escape": return "\u{001B}"
        case "Tab": return "\t"
        case "Up": return NSEvent.SpecialKey.upArrow.unicodeScalar.map { String($0) } ?? "↑"
        case "Down": return NSEvent.SpecialKey.downArrow.unicodeScalar.map { String($0) } ?? "↓"
        case "Left": return NSEvent.SpecialKey.leftArrow.unicodeScalar.map { String($0) } ?? "←"
        case "Right": return NSEvent.SpecialKey.rightArrow.unicodeScalar.map { String($0) } ?? "→"
        default: return token
        }
    }
}

#if canImport(AppKit) && os(macOS)
private extension NSEvent.SpecialKey {
    var unicodeScalar: UnicodeScalar? {
        return UnicodeScalar(self.rawValue)
    }
}
#endif
